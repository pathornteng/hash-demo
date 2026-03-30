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
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/account", icon: <AccountBalanceWallet fontSize="small" />, label: "Account" },
  { to: "/consensus", icon: <Topic fontSize="small" />, label: "Consensus Service" },
  { to: "/fungible-token", icon: <CurrencyExchange fontSize="small" />, label: "Fungible Token" },
  { to: "/non-fungible-token", icon: <Category fontSize="small" />, label: "NFT" },
  { to: "/smart-contract", icon: <Code fontSize="small" />, label: "Smart Contract" },
  { to: "/file", icon: <FileOpen fontSize="small" />, label: "File Service" },
  { to: "/network", icon: <Storage fontSize="small" />, label: "Network" },
];

const Sidebar = (props) => {
  const [txList, setTxList] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const txs = await props.api.getTransactionsByAccountId(
        props.account.accountId
      );
      const items = txs.data.transactions.map((tx) => (
        <Box key={tx.transaction_hash} sx={{ mb: 1 }}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
              <Box sx={{ display: "flex", gap: 0.5, mb: 0.5, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={tx.name}
                  sx={{ fontSize: "0.62rem", height: 18, maxWidth: 120 }}
                />
                <Chip
                  size="small"
                  label={tx.result}
                  color={tx.result === "SUCCESS" ? "success" : "error"}
                  variant="outlined"
                  sx={{ fontSize: "0.62rem", height: 18 }}
                />
              </Box>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://hashscan.io/testnet/transaction/${tx.consensus_timestamp}`}
                style={{ fontSize: "0.68rem", wordBreak: "break-all", display: "block" }}
              >
                {tx.transaction_id}
              </a>
            </CardContent>
          </Card>
        </Box>
      ));
      setTxList(items);
    };

    fetchTransactions();
    const scheduler = setInterval(fetchTransactions, 3000);
    return () => clearInterval(scheduler);
  }, [props.account, props.api]);

  return (
    <Box
      sx={{
        display: { xs: "none", sm: "flex" },
        flexDirection: "column",
        minWidth: 220,
        width: 220,
        pt: 2,
        pb: 2,
        pl: 1,
        borderRight: "1px solid",
        borderColor: "divider",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Navigation */}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ px: 2, mb: 0.5, textTransform: "uppercase", letterSpacing: 0.8 }}
      >
        Navigation
      </Typography>
      <List dense disablePadding>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: "block",
              textDecoration: "none",
              color: isActive ? "#5D6DD8" : "#555",
              borderLeft: isActive ? "3px solid #5D6DD8" : "3px solid transparent",
              backgroundColor: isActive ? "#f0f2ff" : "transparent",
              borderRadius: "0 4px 4px 0",
              marginRight: 8,
            })}
          >
            <ListItem disablePadding>
              <ListItemButton sx={{ py: 0.75, px: 1.5 }}>
                <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          </NavLink>
        ))}
      </List>

      <Divider sx={{ my: 2, mx: 1 }} />

      {/* Recent Transactions */}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ px: 2, mb: 1, textTransform: "uppercase", letterSpacing: 0.8 }}
      >
        Recent Transactions
      </Typography>
      <Box sx={{ px: 1, overflowY: "auto" }}>
        {txList.length === 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
            No recent transactions
          </Typography>
        ) : (
          txList
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
