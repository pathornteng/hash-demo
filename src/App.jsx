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
  const [wallet, setWallet] = useState();
  const api = new MirrorNodeAPI();

  useEffect(() => {}, [wallet]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    // const currentAccount = JSON.parse(localStorage.getItem("currentAccount"));
    // if (currentAccount) {
    //   setAccount(currentAccount);
    //   setAccounts([currentAccount]);
    // }
    // const localAccounts = JSON.parse(localStorage.getItem("accounts"));
    // if (localAccounts) setAccounts(localAccounts);
  };

  const pairWallet = (wallet) => {
    console.log("pairWallet Call ---------");
    localStorage.setItem("hashconnectData", JSON.stringify(wallet[1]));
    setWallet(wallet);
  };

  const renderApp = () => {
    if (wallet) {
      return (
        <Box>
          <Navbar wallet={wallet} api={api} />
          <CssBaseline />
          <Stack direction="row" spacing={2}>
            <Sidebar accountId={wallet[1].pairedAccount} api={api} />
            <Box flex={10} pr={2} pt={2} pb={2}>
              <Routes>
                <Route path="/" element={<MainContent />} />
                <Route
                  path="/account"
                  element={<Account wallet={wallet} api={api} />}
                />
                <Route path="/network" element={<Network wallet={wallet} />} />
                <Route path="/file" element={<FileService wallet={wallet} />} />
                <Route
                  path="/consensus"
                  element={<ConsensusService wallet={wallet} />}
                />
                <Route
                  path="/fungible-token"
                  element={<FungibleToken wallet={wallet} />}
                />
                <Route
                  path="/non-fungible-token"
                  element={<NonFungibleToken wallet={wallet} />}
                />
                <Route
                  path="/smart-contract"
                  element={<SmartContract wallet={wallet} />}
                />
              </Routes>
            </Box>
          </Stack>
        </Box>
      );
    } else {
      return <SignIn api={api} pairWallet={pairWallet} />;
    }
  };

  return renderApp();
};

export default App;
