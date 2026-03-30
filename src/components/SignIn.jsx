import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { PrivateKey } from "@hashgraph/sdk";

const SignIn = (props) => {
  const [errorMsg, setErrorMsg] = useState();
  const [keyType, setKeyType] = useState("ED25519");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const account = {
        accountId: data.get("accountId"),
        privateKey: data.get("privateKey"),
        name: data.get("accountName"),
        keyType,
      };

      const result = await props.api.getAccount(account.accountId);
      if (!account.accountId || result.status !== 200) {
        throw Error("Invalid account id");
      }
      const privateKey =
        keyType === "ECDSA"
          ? PrivateKey.fromStringECDSA(account.privateKey)
          : PrivateKey.fromStringED25519(account.privateKey);
      account.publicKey = privateKey.publicKey.toString();

      props.signIn(account);
    } catch (err) {
      setErrorMsg("Invalid data: " + err.toString());
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pb: 6,
        }}
      >
        {/* Logo + heading */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <img
            alt="hedera logo"
            width="60"
            src={process.env.PUBLIC_URL + "/favicon.png"}
          />
          <Typography variant="h5" fontWeight={700} sx={{ mt: 1.5 }}>
            Hash Demo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hedera Testnet Explorer
          </Typography>
        </Box>

        {/* Form card */}
        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", width: "100%" }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {errorMsg && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMsg}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="accountId"
                label="Account ID"
                name="accountId"
                autoFocus
                size="small"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="privateKey"
                label="Private Key"
                type="password"
                id="privateKey"
                size="small"
              />
              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                  Key Type
                </Typography>
                <ToggleButtonGroup
                  value={keyType}
                  exclusive
                  onChange={(_, val) => val && setKeyType(val)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="ED25519" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
                    ED25519
                  </ToggleButton>
                  <ToggleButton value="ECDSA" sx={{ textTransform: "none", fontSize: "0.8rem" }}>
                    ECDSA (secp256k1)
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TextField
                margin="normal"
                fullWidth
                name="accountName"
                label="Account Name"
                id="accountName"
                size="small"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 2.5, mb: 1.5, textTransform: "none", py: 1.1, fontSize: "0.95rem" }}
              >
                Sign In
              </Button>
              <Box sx={{ textAlign: "center" }}>
                <a href="https://portal.hedera.com/register/" style={{ fontSize: "0.8rem" }}>
                  Don't have keys? Sign up on Hedera Portal →
                </a>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Box
          sx={{
            mt: 2.5,
            px: 2,
            py: 1.5,
            width: "100%",
            borderRadius: 1,
            backgroundColor: "#fffde7",
            border: "1px solid #fff176",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Keys are stored in browser local storage. Transactions incur testnet fees.
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2.5 }}>
          © {new Date().getFullYear()} Hash Demo
        </Typography>
      </Box>
    </Container>
  );
};

export default SignIn;
