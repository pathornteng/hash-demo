import {
  AccountBalanceWallet,
  Category,
  Code,
  CurrencyExchange,
  FileOpen,
  Storage,
  Topic,
} from "@mui/icons-material";
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  Card,
  CardContent,
  CardActionArea,
} from "@mui/material";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const activeLinkStyle = {
  color: "#000",
  textDecoration: "none",
};

const linkStyle = {
  color: "#5D6DD8",
  textDecoration: "none",
};

const Sidebar = (props) => {
  const [txList, setTxList] = useState();

  useEffect(() => {
    const fetchTransactions = async () => {
      const txs = await props.api.getTransactionsByAccountId(props.accountId);
      const txList = txs.data.transactions.map((tx) => {
        return (
          <Box key={tx.transaction_hash} mt={1}>
            <Card>
              <CardActionArea>
                <CardContent>
                  <Chip
                    size="small"
                    label={tx.name}
                    color="primary"
                    variant="outlined"
                  />{" "}
                  <Chip
                    size="small"
                    ml={1}
                    label={tx.result}
                    color="info"
                    variant="outlined"
                  />
                  <Box mt={1}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://hashscan.io/testnet/transaction/${tx.consensus_timestamp}`}
                    >
                      {tx.transaction_id}
                    </a>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        );
      });
      setTxList(txList);
    };
    fetchTransactions();
    const scheduler = setInterval(fetchTransactions, 3000);
    return () => {
      clearInterval(scheduler);
    };
  }, [props.accountId, props.api]);

  return (
    <Box
      flex={2}
      pt={2}
      pb={2}
      pl={2}
      sx={{ display: { xs: "none", sm: "block" } }}
      style={{ minWidth: "300px" }}
    >
      <List>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/account"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <AccountBalanceWallet />
              </ListItemIcon>
              <ListItemText primary="Account"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/file"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <FileOpen />
              </ListItemIcon>
              <ListItemText primary="File Service"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/consensus"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Topic />
              </ListItemIcon>
              <ListItemText primary="Consensus Service"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/fungible-token"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <CurrencyExchange />
              </ListItemIcon>
              <ListItemText primary="Fungible Token"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/non-fungible-token"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Category />
              </ListItemIcon>
              <ListItemText primary="NonFungible Token"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/smart-contract"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Code />
              </ListItemIcon>
              <ListItemText primary="Smart Contract"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
        <NavLink
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
          to="/network"
        >
          <ListItem disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <Storage />
              </ListItemIcon>
              <ListItemText primary="Network"></ListItemText>
            </ListItemButton>
          </ListItem>
        </NavLink>
      </List>
      <Box>
        <div>
          <b>Recent Transactions</b>
        </div>
        <div>{txList}</div>
      </Box>
    </Box>
  );
};

export default Sidebar;
