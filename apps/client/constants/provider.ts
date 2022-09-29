import { ethers } from "ethers";

export class ProviderSingleton {
  static #provider: ethers.providers.InfuraProvider | null = null;

  static get provider() {
    if (!this.#provider) {
      this.#provider = new ethers.providers.InfuraProvider(
        "mainnet",
        // Hardcoding the API key in here for the sake of the quick demo, can be deleted and exchanged for a .env key later on when needed
        "82e55c9bb5284d6d8a109daad92d0b29"
      );
    }

    return this.#provider;
  }
}
