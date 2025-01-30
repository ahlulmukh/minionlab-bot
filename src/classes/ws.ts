import axios, { AxiosResponse } from "axios";
import WebSocket from "ws";
import { logMessage } from "../utils/logger";
import { getProxyAgent } from "./proxy";

export class SocketStream {
  private email: string;
  private password: string;
  private proxy: string | null;
  private axiosConfig: any;
  private ws: WebSocket | null = null;
  private browserId: string = "";
  private userId: string = "";
  private accessToken: string = "";

  constructor(email: string, password: string, proxy: string | null = null) {
    this.email = email;
    this.password = password;
    this.proxy = proxy;
    this.axiosConfig = {
      ...(this.proxy && { httpsAgent: getProxyAgent(this.proxy) }),
      timeout: 60000,
    };
  }

  async makeRequest(method: string, url: string, config: any = {}, retries: number = 3): Promise<AxiosResponse | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config,
        });
        return response;
      } catch (error) {
        if (i === retries - 1) {
          logMessage(null, null, `Request failed: ${(error as any).message}`, "error");
          return null;
        }
        logMessage(null, null, `Retrying... (${i + 1}/${retries})`, "warning");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return null;
  }

  async login(): Promise<void> {
    const loginUrl = "https://api.allstream.ai/web/v1/auth/emailLogin";
    const data = {
      email: this.email,
      password: this.password,
    };

    try {
      const response = await this.makeRequest("POST", loginUrl, { data });
      if (response && response.data) {
        const { data } = response.data;
        this.userId = data.user.uuid;
        this.accessToken = data.token;
        this.browserId = this.generateBrowserId();
        logMessage(null, null, `Logged in successfully for ${this.email}`, "success");
        await this.connectWebSocket();
      }
    } catch (error) {
      logMessage(null, null, `Login failed for ${this.email}: ${(error as any).message}`, "error");
    }
  }

  public async waitUntilReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          logMessage(null, null, `Account ${this.email} is fully ready`, "success");
          resolve();
        } else {
          setTimeout(checkReady, 1000);
        }
      };
      checkReady();
    });
  }
  

  private generateBrowserId(): string {
    const characters = 'abcdef0123456789';
    let browserId = '';
    for (let i = 0; i < 32; i++) {
      browserId += characters[Math.floor(Math.random() * characters.length)];
    }
    return browserId;
  }

  private async connectWebSocket(): Promise<void> {
    const url = "wss://gw0.streamapp365.com/connect";
    const wsOptions = this.proxy ? { agent: getProxyAgent(this.proxy) } : undefined;

    this.ws = new WebSocket(url, wsOptions);

    this.ws.onopen = () => {
      logMessage(null, null, `WebSocket connected for ${this.email}`, "success");
      this.sendRegisterMessage();
      this.startPinging();
    };

    this.ws.onmessage = (event) => {
      let rawData = event.data.toString();
      if (rawData.startsWith("{") && rawData.endsWith("}")) {
        try {
          const message = JSON.parse(rawData);
          this.handleMessage(message);
        } catch (error) {
          logMessage(null, null, `Error parsing JSON: ${(error as any).message}`, "error");
        }
      }
    };

    this.ws.onclose = () => {
      logMessage(null, null, `WebSocket disconnected for ${this.email}`, "warning");
      this.reconnectWebSocket();
    };

    this.ws.onerror = (error) => {
      logMessage(null, null, `WebSocket error for ${this.email}: ${error.message}`, "error");
    };
  }

  private sendRegisterMessage(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: "register",
        user: this.userId,
        dev: this.browserId,
      };

      this.ws.send(JSON.stringify(message));
      logMessage(null, null, `Registered browser for ${this.email}`, "success");
    }
  }

  private async handleMessage(message: any): Promise<void> {
    if (message.type === "request") {
      const { taskid, data } = message;
      const { method, url, headers, body, timeout } = data;

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: method === "POST" ? body : undefined,
          signal: AbortSignal.timeout(timeout),
        });

        this.ws?.send(
          JSON.stringify({
            type: "response",
            taskid,
            result: {
              parsed: "",
              html: "JTdCJTIyY291bnRyeSUyMiUzQSUyMklEJTIyJTJDJTIyYXNuJTIyJTNBJTdCJTIyYXNudW0lMjIlM0E5MzQxJTJDJTIyb3JnX25hbWUlMjIlM0ElMjJQVCUyMElORE9ORVNJQSUyMENPTU5FVFMlMjBQTFVTJTIyJTdEJTJDJTIyZ2VvJTIyJTNBJTdCJTIyY2l0eSUyMiUzQSUyMiUyMiUyQyUyMnJlZ2lvbiUyMiUzQSUyMiUyMiUyQyUyMnJlZ2lvbl9uYW1lJTIyJTNBJTIyJTIyJTJDJTIycG9zdGFsX2NvZGUlMjIlM0ElMjIlMjIlMkMlMjJsYXRpdHVkZSUyMiUzQS02LjE3NSUyQyUyMmxvbmdpdHVkZSUyMiUzQTEwNi44Mjg2JTJDJTIydHolMjIlM0ElMjJBc2lhJTJGSmFrYXJ0YSUyMiU3RCU3RA==",
              rawStatus: response.status,
            },
          })
        );
      } catch (error: any) {
        this.ws?.send(
          JSON.stringify({
            type: "error",
            taskid,
            error: error.message,
            errorCode: 50000001,
            rawStatus: 500,
          })
        );
      }
    } else {
      logMessage(null, null, `Unhandled message type: ${message.type}`, "warning");
    }
  }

  private startPinging(): void {
    const pingServer = async () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
        await this.getPoint();
      }

      setTimeout(pingServer, 60000);
    };

    pingServer();
  }

  private async getPoint(): Promise<void> {
    const pointUrl = `https://api.allstream.ai/web/v1/dashBoard/info`;
  
    try {
      const response = await this.makeRequest("GET", pointUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });
  
      if (response && response.data) {
        const { data } = response.data;
        const message = `Successfully retrieved data for ${this.email}: Total Points = ${data.totalScore ?? 0}, Today Points = ${data.todayScore ?? 0}`;
        logMessage(null, null, message, "success");
      }
    } catch (error) {
      logMessage(null, null, `Error retrieving points for ${this.email}: ${(error as any).message}`, "error");
    }
  }

  private reconnectWebSocket(): void {
    setTimeout(() => {
      this.connectWebSocket();
    }, 5000);
  }
}