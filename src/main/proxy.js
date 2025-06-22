import axios from "axios";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { logMessage } from "../utils/logger.js";

export default class ProxyManager {
  constructor() {
    this.proxyList = [];
    this.axiosConfig = {};
  }

  async getProxyAgent(proxyUrl, index, total) {
    try {
      const isSocks = proxyUrl.toLowerCase().startsWith("socks");
      if (isSocks) {
        const { SocksProxyAgent } = await import("socks-proxy-agent");
        return new SocksProxyAgent(proxyUrl);
      }
      return new HttpsProxyAgent(
        proxyUrl.startsWith("http") ? proxyUrl : `http://${proxyUrl}`
      );
    } catch (error) {
      logMessage(
        index,
        total,
        `Error creating proxy agent: ${error.message}`,
        "error"
      );
      return null;
    }
  }

  loadProxies() {
    try {
      const proxyFile = fs.readFileSync("proxy.txt", "utf8");
      this.proxyList = proxyFile
        .split("\n")
        .filter((line) => line.trim())
        .map((proxy) => {
          proxy = proxy.trim();
          if (!proxy.includes("://")) {
            return `http://${proxy}`;
          }
          return proxy;
        });

      if (this.proxyList.length === 0) {
        throw new Error("No proxies found in proxy.txt");
      }
      logMessage(
        null,
        null,
        `Loaded ${this.proxyList.length} proxies from proxy.txt`,
        "success"
      );
      return true;
    } catch (error) {
      logMessage(null, null, `Error loading proxy: ${error.message}`, "error");
      return false;
    }
  }

  async checkIP(index, total) {
    try {
      const response = await axios.get(
        "https://api.ipify.org?format=json",
        this.axiosConfig
      );
      const ip = response.data.ip;
      logMessage(index, total, `IP Using: ${ip}`, "success");
      return { success: true, ip: ip };
    } catch (error) {
      logMessage(index, total, `Failed to get IP: ${error.message}`, "error");
      return false;
    }
  }

  async getRandomProxy(index, total) {
    if (this.proxyList.length === 0) {
      this.axiosConfig = {};
      await this.checkIP(index, total);
      return null;
    }

    let proxyAttempt = 0;
    while (proxyAttempt < this.proxyList.length) {
      const proxy =
        this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
      try {
        const agent = await this.getProxyAgent(proxy, index, total);
        if (!agent) continue;

        this.axiosConfig.httpsAgent = agent;
        await this.checkIP(index, total);
        return proxy;
      } catch (error) {
        proxyAttempt++;
      }
    }

    logMessage(index, total, "Using default IP", "warning");
    this.axiosConfig = {};
    await this.checkIP(index, total);
    return null;
  }
}
