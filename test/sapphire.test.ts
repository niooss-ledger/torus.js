import { generatePrivate } from "@toruslabs/eccrypto";
import NodeManager from "@toruslabs/fetch-node-details";
import { TORUS_NETWORK } from "@toruslabs/fnd-base";
import { expect } from "chai";
import faker from "faker";
import { keccak256 } from "web3-utils";

import { TorusPublicKey } from "../src";
import TorusUtils from "../src/torus";
import { generateIdToken, lookupVerifier } from "./helpers";

const TORUS_TEST_EMAIL = "saasas@tr.us";
const TORUS_EXTENDED_VERIFIER_EMAIL = "testextenderverifierid@example.com";

const TORUS_TEST_VERIFIER = "torus-test-health";

const TORUS_TEST_AGGREGATE_VERIFIER = "torus-test-health-aggregate";
const HashEnabledVerifier = "torus-test-verifierid-hash";

describe.only("torus utils sapphire", function () {
  let torus: TorusUtils;
  let TORUS_NODE_MANAGER: NodeManager;

  let torusNodeEndpoints;

  beforeEach("one time execution before all tests", async function () {
    TORUS_NODE_MANAGER = new NodeManager({ network: TORUS_NETWORK.SAPPHIRE_DEVNET });
    const nodeDetails = await TORUS_NODE_MANAGER.getNodeDetails({});
    torusNodeEndpoints = nodeDetails.torusNodeSSSEndpoints;
    torus = new TorusUtils({
      metadataHost: "https://sapphire-1.authnetwork.dev/metadata",
      network: "cyan",
      enableOneKey: true,
    });
  });

  it("should fetch public address", async function () {
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: TORUS_TEST_EMAIL };
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.equal("0x4924F91F5d6701dDd41042D94832bB17B76F316F");
  });

  it("should keep public address same", async function () {
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: faker.internet.email() };
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    const publicAddress2 = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.equal(publicAddress2);
  });
  it("should fetch user type and public address", async function () {
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: TORUS_TEST_EMAIL };
    const { address } = await torus.getUserTypeAndAddress(torusNodeEndpoints, verifierDetails, true);
    expect(address).to.equal("0x4924F91F5d6701dDd41042D94832bB17B76F316F");
  });

  it("should be able to key assign", async function () {
    const email = faker.internet.email();
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: email };
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.not.equal("");
    expect(publicAddress).to.not.equal(null);
  });

  it("should be able to login", async function () {
    const token = generateIdToken(TORUS_TEST_EMAIL, "ES256");
    const retrieveSharesResponse = await torus.retrieveShares(torusNodeEndpoints, TORUS_TEST_VERIFIER, { verifier_id: TORUS_TEST_EMAIL }, token);
    expect(retrieveSharesResponse.privKey).to.be.equal("04eb166ddcf59275a210c7289dca4a026f87a33fd2d6ed22f56efae7eab4052c");
  });

  it("should be able to import a key for a new user", async function () {
    const email = faker.internet.email();
    const token = generateIdToken(email, "ES256");
    const privKeyBuffer = generatePrivate();
    const privHex = privKeyBuffer.toString("hex");
    const importKeyResponse = await torus.importPrivateKey(torusNodeEndpoints, TORUS_TEST_VERIFIER, { verifier_id: email }, token, privHex);
    expect(importKeyResponse.privKey).to.be.equal(privHex);
  });

  it("should be able to import a key for a existing user", async function () {
    let verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: TORUS_EXTENDED_VERIFIER_EMAIL };

    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.not.equal(null);
    const token = generateIdToken(TORUS_EXTENDED_VERIFIER_EMAIL, "ES256");
    const privKeyBuffer = generatePrivate();
    const privHex = privKeyBuffer.toString("hex");
    const importKeyResponse = await torus.importPrivateKey(
      torusNodeEndpoints,
      TORUS_TEST_VERIFIER,
      { verifier_id: TORUS_EXTENDED_VERIFIER_EMAIL },
      token,
      privHex
    );

    expect(importKeyResponse.privKey).to.be.equal(privHex);
    verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: TORUS_EXTENDED_VERIFIER_EMAIL };
    const { address } = (await torus.getPublicAddress(torusNodeEndpoints, verifierDetails, true)) as TorusPublicKey;
    expect(importKeyResponse.ethAddress).to.be.equal(address);
  });

  it("should fetch pub address of tss verifier id", async function () {
    const email = TORUS_EXTENDED_VERIFIER_EMAIL;
    const nonce = 0;
    const tssTag = "default";
    const tssVerifierId = `${email}\u0015${tssTag}\u0016${nonce}`;
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: email, extendedVerifierId: tssVerifierId };
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.be.equal("0xBd6Bc8aDC5f2A0526078Fd2016C4335f64eD3a30");
    const publicAddress2 = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.be.equal(publicAddress2);
  });
  it("should assign key to tss verifier id", async function () {
    const email = faker.internet.email();
    const nonce = 0;
    const tssTag = "default";
    const tssVerifierId = `${email}\u0015${tssTag}\u0016${nonce}`;
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: email, extendedVerifierId: tssVerifierId };
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.not.equal(null);
  });

  it("should allow test tss verifier id to fetch shares", async function () {
    const email = faker.internet.email();
    const nonce = 0;
    const tssTag = "default";
    const tssVerifierId = `${email}\u0015${tssTag}\u0016${nonce}`;
    const token = generateIdToken(email, "ES256");
    await torus.retrieveShares(torusNodeEndpoints, TORUS_TEST_VERIFIER, { extended_verifier_id: tssVerifierId, verifier_id: email }, token);
  });

  it("should fetch public address when verifierID hash enabled", async function () {
    const verifierDetails = { verifier: HashEnabledVerifier, verifierId: TORUS_TEST_EMAIL };
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, verifierDetails);
    expect(publicAddress).to.equal("0x9d45b6EB6cC4791aC74f26AEa64CdFE5c7A39dd1");
  });

  // to do: update pub keys
  it.skip("should lookup return hash when verifierID hash enabled", async function () {
    for (const endpoint of torusNodeEndpoints) {
      const pubKeyX = "90a86084f0e07973382ed5a20bf1b6b6634f75c46e5351891a3d3ff4155666b3";
      const pubKeyY = "644724e80f17c57f87d9c6e43db2bfc054c347691bdd79c62c30bebabd185cf2";
      const response = await lookupVerifier(endpoint, pubKeyX, pubKeyY);
      const verifierID = response.result.verifiers[HashEnabledVerifier][0];
      expect(verifierID).to.equal("086c23ab78578f2fce9a1da11c0071ec7c2225adb1bf499ffaee98675bee29b7");
    }
  });

  it("should fetch user type and public address when verifierID hash enabled", async function () {
    const verifierDetails = { verifier: HashEnabledVerifier, verifierId: TORUS_TEST_EMAIL };
    const { address } = await torus.getUserTypeAndAddress(torusNodeEndpoints, verifierDetails, false);
    expect(address).to.equal("0x9d45b6EB6cC4791aC74f26AEa64CdFE5c7A39dd1");
  });
  it("should be able to login when verifierID hash enabled", async function () {
    const token = generateIdToken(TORUS_TEST_EMAIL, "ES256");
    const retrieveSharesResponse = await torus.retrieveShares(torusNodeEndpoints, HashEnabledVerifier, { verifier_id: TORUS_TEST_EMAIL }, token);

    expect(retrieveSharesResponse.privKey).to.be.equal("6fb1bd7d799e8bbe52cd0b2221386828ca675a699bb5d57e159718e104291fa9");
  });

  it.skip("should be able to aggregate login", async function () {
    const email = faker.internet.email();
    const idToken = generateIdToken(email, "ES256");
    const hashedIdToken = keccak256(idToken);
    const retrieveSharesResponse = await torus.retrieveShares(
      torusNodeEndpoints,
      TORUS_TEST_AGGREGATE_VERIFIER,
      {
        verify_params: [{ verifier_id: email, idtoken: idToken }],
        sub_verifier_ids: [TORUS_TEST_VERIFIER],
        verifier_id: email,
      },
      hashedIdToken.substring(2)
    );
    expect(retrieveSharesResponse.ethAddress).to.not.equal(null);
    expect(retrieveSharesResponse.ethAddress).to.not.equal("");
  });
});
