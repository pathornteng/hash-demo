import React, { useState } from "react";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { PrivateKey, PublicKey } from "@hashgraph/cryptography";
import { Alert } from "@mui/material";

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link color="inherit" href="https://hashdemo.com">
        Hash Demo
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const SignIn = (props) => {
  const [errorMsg, setErrorMsg] = useState();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const account = {
        accountId: data.get("accountId"),
        privateKey: data.get("privateKey"),
        publicKey: data.get("publicKey"),
        name: data.get("accountName"),
      };

      const result = await props.api.getAccount(account.accountId);
      if (!account.accountId || result.status !== 200) {
        throw Error("Invalid account id");
      }
      PrivateKey.fromString(account.privateKey);
      PublicKey.fromString(account.publicKey);
      props.signIn(account);
    } catch (err) {
      console.warn(err);
      setErrorMsg("Invalid data: " + err.toString());
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          alt="hedera logo"
          width="150"
          src={process.env.PUBLIC_URL + "/favicon.png"}
        />
        <Typography component="h1" variant="h6">
          Hash Demo
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="accountId"
            label="Account ID"
            name="accountId"
            autoFocus
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="privateKey"
            label="Private Key"
            type="password"
            id="privateKey"
          />
          <TextField
            margin="normal"
            fullWidth
            required
            name="publicKey"
            label="Public Key"
            id="publicKey"
          />
          <TextField
            margin="normal"
            fullWidth
            name="accountName"
            label="Account Name"
            id="accountName"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
          <Grid container>
            <Grid item>
              <Link href="https://portal.hedera.com/register/" variant="body2">
                {"Don't have keys? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Copyright sx={{ mt: 3, mb: 4 }} />
    </Container>
  );
};

export default SignIn;
