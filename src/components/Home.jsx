import { Card, CardContent, Chip, Divider, Typography } from "@mui/material";

const Home = () => {
  return (
    <div>
      <Card sx={{ minWidth: 275 }}>
        <CardContent style={{ textAlign: "center" }}>
          <img
            alt="hedera logo"
            src={process.env.PUBLIC_URL + "/favicon.png"}
          />
          <Typography variant="h2" color="text.secondary" gutterBottom>
            Hello Future
          </Typography>
          <Divider>
            <Chip label="Hash Demo" />
          </Divider>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>HashDemo</b> is a demonstration application built for{" "}
            <b>Hedera Network</b>. It's designed to demonstrate the capabilities
            and services offered by the network. The services include{" "}
            <a
              href="https://hedera.com/token-service"
              rel="noreferrer"
              target="_blank"
            >
              Hedera Token Service
            </a>
            ,
            <a
              href="https://hedera.com/consensus-service"
              rel="noreferrer"
              target="_blank"
            >
              Hedera Consensus Service
            </a>
            ,{" "}
            <a
              href="https://docs.hedera.com/guides/docs/hedera-api/file-service"
              target="_blank"
              rel="noreferrer"
            >
              Hedera File Service
            </a>
            , and{" "}
            <a
              href="https://hedera.com/smart-contract"
              rel="noreferrer"
              target="_blank"
            >
              Hedera Smart Contract Service
            </a>
            . <b>HashDemo</b> also demonstrates how applications can utilize{" "}
            <a
              href="https://docs.hedera.com/guides/docs/mirror-node-api/rest-api"
              target="_blank"
              rel="noreferrer"
            >
              the MirrorNode APIs
            </a>{" "}
            and{" "}
            <a href="https://hashscan.io" rel="noreferrer" target="_blank">
              hashscan.io
            </a>{" "}
            built by{" "}
            <a href="https://swirldslabs.com/" rel="noreferrer" target="_blank">
              Swirds Labs
            </a>{" "}
            to gather transaction history and state from Hedera Network.{" "}
          </Typography>
          <Divider>
            <Chip label="Hedera" />
          </Divider>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <a href="https://hedera.com" rel="noreferrer" target="_blank">
              Hedera
            </a>{" "}
            is the most used enterprise-grade public network for you to make
            your digital world exactly as it should be – yours. HBAR is the
            native, energy-efficient cryptocurrency of Hedera that powers the
            decentralized economy. Whether you're a startup or enterprise, a
            creator or consumer, Hedera goes beyond blockchain for developers to
            create the next era of fast, fair, and secure applications.
          </Typography>
          <Divider>
            <Chip label="Disclaimer" />
          </Divider>
          <p>
            <b>Hash Demo</b> is designed to work with testnet. All user keys,
            private and public keys, are kept in browser local storage. Using
            Hash Demo will incur transaction fee to the account on testnet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
