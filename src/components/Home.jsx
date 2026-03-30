import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
import { Category, Code, CurrencyExchange, FileOpen, Topic } from "@mui/icons-material";

const services = [
  {
    icon: <CurrencyExchange sx={{ fontSize: 18 }} />,
    label: "Token Service",
    description: "Create and manage fungible and non-fungible tokens on Hedera.",
    href: "https://hedera.com/token-service",
  },
  {
    icon: <Topic sx={{ fontSize: 18 }} />,
    label: "Consensus Service",
    description: "Build tamper-proof audit logs and decentralized messaging.",
    href: "https://hedera.com/consensus-service",
  },
  {
    icon: <FileOpen sx={{ fontSize: 18 }} />,
    label: "File Service",
    description: "Store and retrieve files on the Hedera distributed ledger.",
    href: "https://docs.hedera.com/guides/docs/hedera-api/file-service",
  },
  {
    icon: <Code sx={{ fontSize: 18 }} />,
    label: "Smart Contract",
    description: "Deploy and interact with Solidity smart contracts on Hedera.",
    href: "https://hedera.com/smart-contract",
  },
];

const Home = () => {
  return (
    <Box>
      {/* Hero */}
      <Card
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", textAlign: "center", mb: 3 }}
      >
        <CardContent sx={{ py: 5 }}>
          <img
            alt="hedera logo"
            height="72"
            src={process.env.PUBLIC_URL + "/favicon.png"}
          />
          <Typography variant="h3" fontWeight={700} sx={{ mt: 2 }}>
            Hello Future
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 500, mx: "auto", lineHeight: 1.7 }}
          >
            A hands-on demo for exploring Hedera Network services — tokens,
            consensus, files, and smart contracts on Testnet.
          </Typography>
        </CardContent>
      </Card>

      {/* Services */}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ display: "block", mb: 1.5, textTransform: "uppercase", letterSpacing: 1 }}
      >
        Services
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {services.map((service) => (
          <Grid item xs={12} sm={6} key={service.label}>
            <Card
              elevation={0}
              sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                  <Box
                    sx={{
                      color: "#fff",
                      backgroundColor: "#5D6DD8",
                      borderRadius: 1,
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {service.icon}
                  </Box>
                  <Typography fontWeight={700} variant="body1">
                    {service.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                  {service.description}
                </Typography>
                <a href={service.href} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem" }}>
                  Learn more →
                </a>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* About */}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ display: "block", mb: 1.5, textTransform: "uppercase", letterSpacing: 1 }}
      >
        About Hedera
      </Typography>
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
            <a href="https://hedera.com" rel="noreferrer" target="_blank">Hedera</a>{" "}
            is the most used enterprise-grade public network — fast, fair, and secure.
            HBAR is its native, energy-efficient cryptocurrency. HashDemo also leverages
            the{" "}
            <a href="https://docs.hedera.com/guides/docs/mirror-node-api/rest-api" target="_blank" rel="noreferrer">
              Mirror Node API
            </a>{" "}
            and{" "}
            <a href="https://hashscan.io" rel="noreferrer" target="_blank">HashScan</a>{" "}
            by{" "}
            <a href="https://swirldslabs.com/" rel="noreferrer" target="_blank">Swirlds Labs</a>{" "}
            to display transaction history and network state.
          </Typography>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 1,
          backgroundColor: "#fffde7",
          border: "1px solid #fff176",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <b>Disclaimer:</b> Hash Demo works with Hedera Testnet. Keys are stored in
          your browser's local storage. Transactions will incur testnet fees.
        </Typography>
      </Box>
    </Box>
  );
};

export default Home;
