import { Stack } from "@mui/material";
import { Box } from "@mui/system";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/Home";
import Account from "./components/Account";
import Network from "./components/Network";
import FileService from "./components/FileService";
import SmartContract from "./components/SmartContract";
import ConsensusService from "./components/ConsensusService";
import SignIn from "./components/SignIn";
import CssBaseline from "@mui/material/CssBaseline";
import { Routes, Route } from "react-router-dom";
import { Client } from "@hashgraph/sdk";
import React, { useEffect, useState } from "react";
import FungibleToken from "./components/FungibleToken";
import NonFungibleToken from "./components/NonFungibleToken";
import MirrorNodeAPI from "./api/mirror-node-api";
import "./App.css";

const App = () => {
  const [account, setAccount] = useState();
  const [accounts, setAccounts] = useState();
  const client = Client.forTestnet();
  const api = new MirrorNodeAPI(process.env.REACT_APP_API_URL);

  useEffect(() => {
    if (account) client.setOperator(account.accountId, account.privateKey);
  }, [account, accounts, client]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const currentAccount = JSON.parse(localStorage.getItem("currentAccount"));
    if (currentAccount) {
      setAccount(currentAccount);
      setAccounts([currentAccount]);
    }

    const localAccounts = JSON.parse(localStorage.getItem("accounts"));
    if (localAccounts) setAccounts(localAccounts);
  };

  const changeAccount = (account) => {
    setAccount(account);
    if (account) {
      localStorage.setItem("currentAccount", JSON.stringify(account));
    } else {
      localStorage.removeItem("currentAccount");
    }
  };

  const signIn = (account) => {
    localStorage.setItem("currentAccount", JSON.stringify(account));
    localStorage.setItem("accounts", JSON.stringify([account]));
    setAccount(account);
    setAccounts([account]);
  };

  const renderApp = () => {
    if (account) {
      return (
        <Box>
          <Navbar
            accountId={account.accountId}
            accounts={accounts}
            changeAccount={changeAccount}
            api={api}
          />
          <CssBaseline />
          <Stack direction="row" spacing={2}>
            <Sidebar account={account} api={api} />
            <Box flex={10} pr={2} pt={2} pb={2}>
              <Routes>
                <Route path="/" element={<MainContent />} />
                <Route
                  path="/account"
                  element={
                    <Account
                      account={account}
                      accounts={accounts}
                      setAccounts={setAccounts}
                      changeAccount={changeAccount}
                      client={client}
                    />
                  }
                />
                <Route
                  path="/network"
                  element={
                    <Network
                      accountId={account.accountId}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      client={client}
                    />
                  }
                />
                <Route
                  path="/file"
                  element={
                    <FileService
                      accountId={account.accountId}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      client={client}
                    />
                  }
                />
                <Route
                  path="/consensus"
                  element={
                    <ConsensusService
                      accountId={account.accountId}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      client={client}
                    />
                  }
                />
                <Route
                  path="/fungible-token"
                  element={
                    <FungibleToken
                      accountId={account.accountId}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      client={client}
                    />
                  }
                />
                <Route
                  path="/non-fungible-token"
                  element={
                    <NonFungibleToken
                      accountId={account.accountId}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      client={client}
                    />
                  }
                />
                <Route
                  path="/smart-contract"
                  element={
                    <SmartContract
                      accountId={account.accountId}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      client={client}
                    />
                  }
                />
              </Routes>
            </Box>
          </Stack>
        </Box>
      );
    } else {
      return <SignIn signIn={signIn} api={api} />;
    }
  };

  return renderApp();
};

export default App;
