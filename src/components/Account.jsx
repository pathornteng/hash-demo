import React, { useState, useEffect, useRef } from "react";
import {
  AccountBalanceQuery,
  TransferTransaction,
  Hbar,
  PrivateKey,
  AccountCreateTransaction,
  AccountUpdateTransaction,
} from "@hashgraph/sdk";
import {
  AccountBalanceWallet,
  Add,
  Close,
  Delete,
  Download,
  Key,
  MonetizationOn,
  MoneyOff,
  Send,
} from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 440,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  outline: "none",
  overflow: "hidden",
};

const InfoRow = ({ label, children }) => (
  <Box>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

const Account = (props) => {
  const [hbarBalance, setHbarBalance] = useState("0");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [accountInfo, setAccountInfo] = useState({});
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [newKeyType, setNewKeyType] = useState("ED25519");
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });

  const accountRef = useRef();
  const amountRef = useRef();
  const fetchAccountRef = useRef();
  const accountNameRef = useRef();
  const initBalanceRef = useRef();
  const stakeAccountRef = useRef();

  useEffect(() => {
    const fetchBalance = async () => {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(props.account.accountId)
        .execute(props.client);
      setHbarBalance(accountBalance.hbars.toString());
    };
    const pk =
      props.account.keyType === "ECDSA"
        ? PrivateKey.fromStringECDSA(props.account.privateKey)
        : PrivateKey.fromStringED25519(props.account.privateKey);
    setPrivateKey(pk.toStringRaw());
    fetchBalance();
  }, [props.account, props.client, refreshCount]);

  const stake = async () => {
    setBackdropOpen(true);
    try {
      const txResponse = await new AccountUpdateTransaction()
        .setAccountId(props.account.accountId)
        .setStakedAccountId(stakeAccountRef.current?.value)
        .execute(props.client);
      await txResponse.getReceipt(props.client);
      setSnackbar({ message: "Staking succeeded!", severity: "success", open: true });
    } catch (err) {
      setSnackbar({ message: "Staking failed! " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const transfer = async () => {
    setBackdropOpen(true);
    setTransferModalOpen(false);
    try {
      const sendHbar = await new TransferTransaction()
        .addHbarTransfer(props.account.accountId, Hbar.from(-amountRef.current.value))
        .addHbarTransfer(accountRef.current.value, Hbar.from(amountRef.current.value))
        .execute(props.client);
      await sendHbar.getReceipt(props.client);
      setSnackbar({ message: "Transaction succeeded!", severity: "success", open: true });
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Transaction failed! " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const createAccount = async () => {
    setBackdropOpen(true);
    try {
      let newAccountPrivateKey;
      if (newKeyType === "ED25519") {
        newAccountPrivateKey = await PrivateKey.generateED25519();
      } else {
        newAccountPrivateKey = await PrivateKey.generateECDSA();
      }
      const newAccountPublicKey = newAccountPrivateKey.publicKey;
      const createAccountTx = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromString(initBalanceRef.current?.value))
        .execute(props.client);
      const getReceipt = await createAccountTx.getReceipt(props.client);
      const newAccountId = getReceipt.accountId;
      const newAccount = {
        name: accountNameRef.current?.value,
        accountId: newAccountId.toString(),
        privateKey: newAccountPrivateKey.toString(),
        publicKey: newAccountPublicKey.toString(),
        keyType: newKeyType === "ED25519" ? "ED25519" : "ECDSA",
      };
      const accountList = [...props.accounts, newAccount];
      props.setAccounts(accountList);
      localStorage.setItem("accounts", JSON.stringify(accountList));
      setSnackbar({ message: "A new account is created!", severity: "success", open: true });
      setCreateAccountModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Creating new account failed " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const deleteAccount = () => {
    try {
      const currentAccounts = JSON.parse(localStorage.getItem("accounts"));
      const filteredAccounts = currentAccounts.filter(
        (account) => account.accountId !== props.account.accountId
      );
      props.changeAccount(filteredAccounts[0]);
      props.setAccounts(filteredAccounts);
      localStorage.setItem("accounts", JSON.stringify(filteredAccounts));
      setSnackbar({ message: "Deleted account successfully", severity: "success", open: true });
    } catch (err) {
      setSnackbar({ message: "Failed to delete account " + err.toString(), severity: "error", open: true });
    }
  };

  const fetchAccount = async () => {
    setBackdropOpen(true);
    try {
      const accountInfo = await props.api.getAccount(fetchAccountRef.current?.value);
      setAccountInfo({ information: accountInfo.data });
    } catch (err) {
      setSnackbar({ severity: "error", message: "Failed to fetch account " + err.toString(), open: true });
    }
    setBackdropOpen(false);
  };

  const info = accountInfo.information;

  return (
    <div>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 200 }} open={backdropOpen}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3000}
        open={snackbar.open}
        onClose={() => setSnackbar({ open: false, message: snackbar.message, severity: snackbar.severity })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Page title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <AccountBalanceWallet fontSize="small" />
        <Typography variant="h5" fontWeight={700}>Account</Typography>
      </Box>

      {/* Account summary */}
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {props.account.name || "My Account"}
            </Typography>
            {!props.account.isMainAccount && (
              <IconButton size="small" color="error" onClick={deleteAccount}>
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2.5 }}>
            <InfoRow label="Account ID">
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={"https://hashscan.io/testnet/account/" + props.account.accountId}
                >
                  {props.account.accountId}
                </a>
              </Typography>
            </InfoRow>

            <InfoRow label="Public Key">
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", fontSize: "0.72rem", wordBreak: "break-all", color: "text.secondary" }}
              >
                {props.account.publicKey}
              </Typography>
            </InfoRow>

            <InfoRow label="Private Key">
              <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                <Chip
                  label={props.account.keyType || "ED25519"}
                  size="small"
                  color="info"
                  sx={{ fontSize: "0.72rem" }}
                />
                <Tooltip arrow title={props.account.privateKey}>
                  <Chip icon={<Key sx={{ fontSize: "14px !important" }} />} label="DER" size="small" variant="outlined" clickable sx={{ fontSize: "0.72rem" }} />
                </Tooltip>
                <Tooltip arrow title={privateKey}>
                  <Chip icon={<Key sx={{ fontSize: "14px !important" }} />} label="Raw" size="small" variant="outlined" clickable sx={{ fontSize: "0.72rem" }} />
                </Tooltip>
              </Box>
            </InfoRow>

            <InfoRow label="Balance">
              <Typography variant="h6" fontWeight={700}>{hbarBalance}</Typography>
            </InfoRow>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="contained" color="primary" size="small" startIcon={<MonetizationOn />} onClick={() => setTransferModalOpen(true)} sx={{ textTransform: "none" }}>
              Transfer HBAR
            </Button>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => setCreateAccountModalOpen(true)} sx={{ textTransform: "none" }}>
              Create Account
            </Button>
            <Button variant="outlined" size="small" startIcon={<MoneyOff />} onClick={() => setStakeModalOpen(true)} sx={{ textTransform: "none" }}>
              Stake
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Transfer HBAR</Typography>
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Receiver's Account ID" fullWidth variant="outlined" size="small" inputRef={accountRef} />
            <TextField label="Amount (HBAR)" fullWidth variant="outlined" size="small" inputRef={amountRef} />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setTransferModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Send />} onClick={transfer} sx={{ textTransform: "none" }}>Send</Button>
          </Box>
        </Box>
      </Modal>

      {/* Create Account Modal */}
      <Modal open={createAccountModalOpen} onClose={() => setCreateAccountModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Create New Account</Typography>
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Account Name" fullWidth variant="outlined" size="small" inputRef={accountNameRef} />
            <TextField label="Initial Balance (HBAR)" fullWidth variant="outlined" size="small" inputRef={initBalanceRef} />
            <Box>
              <InputLabel sx={{ fontSize: "0.8rem", mb: 0.5 }}>Key Type</InputLabel>
              <Select value={newKeyType} onChange={(e) => setNewKeyType(e.target.value)} size="small" fullWidth>
                <MenuItem value="ED25519">ED25519</MenuItem>
                <MenuItem value="SECP256K1">ECDSA (secp256k1)</MenuItem>
              </Select>
            </Box>
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setCreateAccountModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Add />} onClick={createAccount} sx={{ textTransform: "none" }}>Create</Button>
          </Box>
        </Box>
      </Modal>

      {/* Stake Modal */}
      <Modal open={stakeModalOpen} onClose={() => setStakeModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Stake to Account</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <TextField label="Account ID to stake to" fullWidth variant="outlined" size="small" inputRef={stakeAccountRef} />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setStakeModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Send />} onClick={stake} sx={{ textTransform: "none" }}>Stake</Button>
          </Box>
        </Box>
      </Modal>

      {/* Get Account Info */}
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Get Account Info
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2.5 }}>
            <TextField
              label="Account ID"
              variant="outlined"
              size="small"
              inputRef={fetchAccountRef}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<Download />}
              onClick={fetchAccount}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Fetch
            </Button>
          </Box>

          {info != null && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                p: 2,
                backgroundColor: "#fafafa",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {[
                ["Account ID", info?.account],
                ["Balance", Hbar.fromTinybars(info?.balance?.balance).toString()],
                ["EVM Address", info?.evm_address],
                ["Alias", info?.alias],
                ["Deleted", info?.deleted?.toString()],
                ["Expiry", info?.expiry_timestamp],
                ["Auto Renew Period", info?.auto_renew_period],
                ["Account Memo", info?.memo],
                ["Staked Account ID", info?.staked_account_id],
                ["Staked Node ID", info?.staked_node_id],
                ["Stake Period Start", info?.stake_period_start],
              ]
                .filter(([, val]) => val != null && val !== "")
                .map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                  Tokens
                </Typography>
                <Box component="pre" sx={{ fontFamily: "monospace", fontSize: "0.72rem", m: 0, color: "text.secondary", overflowX: "auto" }}>
                  {JSON.stringify(info?.balance?.tokens, null, 2)}
                </Box>
              </Box>
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                  Keys
                </Typography>
                <Box component="pre" sx={{ fontFamily: "monospace", fontSize: "0.72rem", m: 0, color: "text.secondary", overflowX: "auto" }}>
                  {JSON.stringify(info?.key, null, 2)}
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;
