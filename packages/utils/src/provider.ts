import { ethers } from "ethers";

const apiKey = "82e55c9bb5284d6d8a109daad92d0b29";

export class ProviderSingleton {
  static #provider: ethers.providers.InfuraProvider | null = null;

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
}
