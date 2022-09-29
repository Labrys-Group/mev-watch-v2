import { ethers } from "ethers";

// Real key
// const apiKey = "82e55c9bb5284d6d8a109daad92d0b29";
const apiKey = "f7d929e14e3e4a5990e88be8a1758c21";

export class ProviderSingleton {
  static #provider: ethers.providers.InfuraProvider | null = null;

  static #batchProvider: ethers.providers.JsonRpcBatchProvider | null = null;

  static #websocketProvider: ethers.providers.InfuraWebSocketProvider | null =
    null;

  static get provider() {
    if (!this.#provider) {
      this.#provider = new ethers.providers.InfuraProvider(
        "mainnet",
        // Hardcoding the API key in here for the sake of the quick demo, can be deleted and exchanged for a .env key later on when needed
        apiKey
      );
    }

    return this.#provider;
  }

  static get websocketProvider(): ethers.providers.InfuraWebSocketProvider {
    if (!this.#websocketProvider) {
      this.#websocketProvider = new ethers.providers.InfuraWebSocketProvider(
        "mainnet",
        apiKey
      );
    }

    return this.#websocketProvider;
  }

  static get batchProvider() {
    if (!this.#batchProvider) {
      this.#batchProvider = new ethers.providers.JsonRpcBatchProvider(
        `https://mainnet.infura.io/v3/${apiKey}`
      );
    }

    return this.#batchProvider;
  }
}
