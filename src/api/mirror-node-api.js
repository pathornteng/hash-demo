import axios from "axios";

class MirrorNodeAPI {
  constructor() {
    this.req = axios.create({
      baseURL: "https://testnet.mirrornode.hedera.com/",
    });
  }

  async getNodes() {
    return await this.req.get(`api/v1/network/nodes`);
  }

  async getTopicMessages(topicId, afterTimestamp = null) {
    const params = new URLSearchParams({ limit: 25, order: "asc" });
    if (afterTimestamp) params.set("timestamp", `gt:${afterTimestamp}`);
    return await this.req.get(`api/v1/topics/${topicId}/messages?${params}`);
  }

  async getToken(tokenId) {
    try {
      return await this.req.get(`api/v1/tokens/${tokenId}`);
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }

  async getTopic(topicId) {
    try {
      return await this.req.get(`api/v1/topics/${topicId}/messages`);
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }

  async getContract(contractId) {
    try {
      return await this.req.get(`api/v1/contracts/${contractId}`);
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }

  async getTransaction(txId) {
    try {
      return await this.req.get(`api/v1/transactions/${txId}`);
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }

  async getTransactionsByAccountId(accountId) {
    try {
      return await this.req.get(
        `api/v1/transactions?account.id=${accountId}&limit=5`
      );
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }

  async getAccount(accountId) {
    try {
      return await this.req.get(`api/v1/accounts/${accountId}`);
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }

  async getNft(tokenId, serial) {
    try {
      return await this.req.get(`api/v1/tokens/${tokenId}/nfts/${serial}`);
    } catch (err) {
      return {
        status: 400,
        err: err,
      };
    }
  }
}

export default MirrorNodeAPI;
