import {
  AppBar,
  Box,
  FormControl,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Toolbar,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import { styled, alpha } from "@mui/material/styles";
import React, { useRef } from "react";
import { NavLink } from "react-router-dom";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.1),
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.18),
  },
  marginLeft: theme.spacing(1),
  width: "auto",
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 1.5),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0.6,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(0.75, 1, 0.75, 0),
    paddingLeft: `calc(1em + ${theme.spacing(3.5)})`,
    fontSize: "0.85rem",
    width: "22ch",
    "&:focus": { width: "28ch" },
    transition: theme.transitions.create("width"),
  },
}));

const Navbar = (props) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const searchRef = useRef();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleAccountChange = (e) => {
    props.accounts.forEach((account) => {
      if (e.target.value === account.accountId) {
        props.changeAccount(account);
      }
    });
  };

  const openLink = (url) => {
    window.open(url, "_blank", "noopener");
  };

  const handleSearch = async (e) => {
    if (e.key === "Enter") {
      let query = searchRef.current?.value;
      let queryArray = query.split("@");
      let resp;

      if (queryArray.length === 1) {
        resp = await props.api.getAccount(query);
        if (resp.status === 200) { openLink(`https://hashscan.io/testnet/account/${query}`); return; }
        resp = await props.api.getToken(query);
        if (resp.status === 200) { openLink(`https://hashscan.io/testnet/token/${query}`); return; }
        resp = await props.api.getTopic(query);
        if (resp.status === 200) { openLink(`https://hashscan.io/testnet/topic/${query}`); return; }
        resp = await props.api.getContract(query);
        if (resp.status === 200) { openLink(`https://hashscan.io/testnet/contract/${query}`); return; }
      }

      if (queryArray.length > 1) {
        queryArray[1] = queryArray[1].replace(".", "-");
        query = `${queryArray[0]}-${queryArray[1]}`;
      }

      resp = await props.api.getTransaction(query);
      if (resp.status === 200) { openLink(`https://hashscan.io/testnet/transaction/${query}`); return; }
    }
  };

  const accountList = props.accounts?.map((account) => (
    <MenuItem key={account.accountId} value={account.accountId}>
      {`[${account.name}] ${account.accountId}`}
    </MenuItem>
  ));

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <img
            style={{ height: "48px" }}
            alt="Logo"
            src={process.env.PUBLIC_URL + "/favicon.png"}
          />

          <Typography
            variant="subtitle1"
            fontWeight={700}
            noWrap
            sx={{ flexGrow: 1, display: { xs: "none", sm: "block" }, ml: 1 }}
          >
            <NavLink style={{ color: "inherit", textDecoration: "none" }} to="/">
              Hash Demo
            </NavLink>
          </Typography>

          <Typography variant="caption" sx={{ opacity: 0.6, display: { xs: "none", md: "block" } }}>
            Account:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={props.accountId}
              onChange={handleAccountChange}
              variant="standard"
              disableUnderline
              sx={{ color: "white", fontSize: "0.85rem", "& .MuiSelect-icon": { color: "white" } }}
            >
              {accountList}
            </Select>
          </FormControl>

          <Search>
            <SearchIconWrapper>
              <SearchIcon fontSize="small" />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search accounts, tokens…"
              inputProps={{ "aria-label": "search" }}
              onKeyDown={handleSearch}
              inputRef={searchRef}
            />
          </Search>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Navbar;
