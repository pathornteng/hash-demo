import React, { useState, useEffect, useRef } from "react";
import {
  AccountBalanceQuery,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  PrivateKey,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  TokenDeleteTransaction,
  TransferTransaction,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import {
  Close,
  Create,
  CurrencyExchange,
  Delete,
  Key,
  Link,
  LinkOff,
  MonetizationOn,
  Money,
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
  Grid,
  IconButton,
  Modal,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import MirrorNodeAPI from "../api/mirror-node-api";

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

const FungibleToken = (props) => {
  const mirrorNodeDelay = 4000;
  const [hbarBalance, setHbarBalance] = useState("0");
  const [tokens, setTokens] = useState([]);
  const [tokenInfo, setTokenInfo] = useState({});
  const [selectedToken, setSelectedToken] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [sigKey, setSigKey] = useState();
  const [snackbar, setSnackbar] = useState({ message: "", severity: "success", open: false });

  const accountRef = useRef();
  const amountRef = useRef();
  const tokenNameRef = useRef();
  const tokenSymbolRef = useRef();
  const decimalRef = useRef();
  const totalSupplyRef = useRef();
  const tokenIdRef = useRef();
  const mintAmountRef = useRef();

  useEffect(() => {
    setTokens([]);
    const fetchAccount = async () => {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(props.accountId)
        .execute(props.client);
      setHbarBalance(accountBalance.hbars.toString());
      const api = new MirrorNodeAPI();
      const resp = await api.getAccount(props.accountId);
      const account = resp.data;
      const tokens = account.balance.tokens;
      let tokenRelationships = [];
      let tokenInfo = {};
      setLoading(true);
      for (const token of tokens) {
        let query = await api.getToken(token.token_id);
        query.data.balance = token.balance;
        tokenInfo[token.token_id] = query.data;
        tokenRelationships.push(token);
      }
      setTokenInfo(tokenInfo);
      setTokens(tokenRelationships);
      setLoading(false);
    };
    fetchAccount();
    setSigKey(PrivateKey.fromString(props.privateKey));
  }, [props.accountId, props.client, props.privateKey, refreshCount]);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const transferToken = async () => {
    setBackdropOpen(true);
    try {
      const amount = parseInt(amountRef.current?.value);
      const receiverAccount = accountRef.current?.value;
      const transaction = await new TransferTransaction()
        .addTokenTransfer(selectedToken.token_id, props.accountId, -amount)
        .addTokenTransfer(selectedToken.token_id, receiverAccount, amount)
        .freezeWith(props.client);
      const signTx = await transaction.sign(sigKey);
      const txResponse = await signTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Tokens transferred successfully", severity: "success", open: true });
      setTransferModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to transfer token: " + err.toString(), severity: "error", open: true });
      setTransferModalOpen(false);
    }
    setBackdropOpen(false);
  };

  const mintToken = async () => {
    setBackdropOpen(true);
    try {
      const tx = await new TokenMintTransaction()
        .setTokenId(selectedToken.token_id)
        .setAmount(parseInt(mintAmountRef.current?.value))
        .freezeWith(props.client);
      const signedTx = await tx.sign(sigKey);
      const txResponse = await signedTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Tokens minted successfully", severity: "success", open: true });
      setMintModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to mint token: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const deleteToken = async (token) => {
    setBackdropOpen(true);
    try {
      const transaction = await new TokenDeleteTransaction()
        .setTokenId(token.token_id.toString())
        .freezeWith(props.client);
      const signTx = await transaction.sign(sigKey);
      const txResponse = await signTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Token deleted successfully", severity: "success", open: true });
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to delete the token: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const tokenList = tokens
    .filter((token) => tokenInfo[token.token_id]?.type === "FUNGIBLE_COMMON")
    .map((token) => {
      const info = tokenInfo[token.token_id.toString()];
      const isTreasury = info?.treasury_account_id?.toString() === props.accountId;
      const isAdmin = props.publicKey.includes(info?.admin_key?.key?.toString()) && !info?.deleted;
      const canDissociate = info?.deleted || (!isTreasury && info?.balance === 0);

      return (
        <Grid item xs={12} sm={6} key={token.token_id.toString()}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                <Box>
                  <Typography fontWeight={700}>{info?.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                    {info?.symbol}
                  </Typography>
                </Box>
                <Chip
                  label={info?.deleted ? "Deleted" : "Active"}
                  size="small"
                  color={info?.deleted ? "error" : "success"}
                  variant="outlined"
                  sx={{ fontSize: "0.68rem", height: 20 }}
                />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                    Token ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={"https://hashscan.io/testnet/token/" + token.token_id.toString()}
                    >
                      {token.token_id.toString()}
                    </a>
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                      Balance
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{info?.balance?.toString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                      Type
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{info?.type}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                    Treasury
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                      {info?.treasury_account_id?.toString()}
                    </Typography>
                    {isTreasury && (
                      <Chip label="you" size="small" sx={{ fontSize: "0.62rem", height: 16 }} />
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {!info?.deleted && (
                  <Button variant="contained" color="primary" size="small" startIcon={<Send />}
                    onClick={() => { setTransferModalOpen(true); setSelectedToken(token); }}
                    sx={{ textTransform: "none" }}>
                    Transfer
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outlined" size="small" startIcon={<Money />}
                    onClick={() => { setSelectedToken(token); setMintModalOpen(true); }}
                    sx={{ textTransform: "none" }}>
                    Mint
                  </Button>
                )}
                {canDissociate && (
                  <Button variant="outlined" size="small" color="error" startIcon={<LinkOff />}
                    onClick={() => dissociateToken(token)}
                    sx={{ textTransform: "none", ml: "auto" }}>
                    Dissociate
                  </Button>
                )}
                {isAdmin && (
                  <IconButton size="small" color="error" onClick={() => deleteToken(token)} sx={{ ml: canDissociate ? 0 : "auto" }}>
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      );
    });

  const associateToken = async () => {
    setBackdropOpen(true);
    try {
      let associateTx = await new TokenAssociateTransaction()
        .setAccountId(props.accountId)
        .setTokenIds([tokenIdRef.current?.value])
        .freezeWith(props.client)
        .sign(sigKey);
      let associateTxSubmit = await associateTx.execute(props.client);
      await associateTxSubmit.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Token associated successfully!", severity: "success", open: true });
      setAssociateModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to associate token: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const dissociateToken = async (token) => {
    setBackdropOpen(true);
    try {
      let dissociateTx = await new TokenDissociateTransaction()
        .setAccountId(props.accountId)
        .setTokenIds([token.token_id.toString()])
        .freezeWith(props.client)
        .sign(sigKey);
      let dissociateTxSubmit = await dissociateTx.execute(props.client);
      await dissociateTxSubmit.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Token dissociated successfully", severity: "success", open: true });
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Dissociation failed: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const createToken = async () => {
    setBackdropOpen(true);
    try {
      const sigKey = PrivateKey.fromString(props.privateKey);
      const tokenName = tokenNameRef.current?.value;
      const tokenSymbol = tokenSymbolRef.current?.value;
      const decimal = parseInt(decimalRef.current?.value);
      const totalSupply = parseInt(totalSupplyRef.current?.value);
      let tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol(tokenSymbol)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(decimal)
        .setInitialSupply(totalSupply)
        .setTreasuryAccountId(props.accountId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(sigKey)
        .setAdminKey(sigKey)
        .freezeWith(props.client);
      let tokenCreateSign = await tokenCreateTx.sign(sigKey);
      let tokenCreateSubmit = await tokenCreateSign.execute(props.client);
      let tokenCreateRx = await tokenCreateSubmit.getReceipt(props.client);
      let tokenId = tokenCreateRx.tokenId;
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Token created! ID: " + tokenId, severity: "success", open: true });
      setCreateModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to create token: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  return (
    <div>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1000 }} open={backdropOpen}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3000}
        open={snackbar.open}
        onClose={() => setSnackbar({ open: false, message: snackbar.message, severity: snackbar.severity })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <CurrencyExchange fontSize="small" />
        <Typography variant="h5" fontWeight={700}>Fungible Token</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Account summary */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Account</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, mb: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>Account ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                    <a target="_blank" rel="noreferrer" href={"https://hashscan.io/testnet/account/" + props.accountId}>
                      {props.accountId}
                    </a>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>Balance</Typography>
                  <Typography variant="body2" fontWeight={700}>{hbarBalance}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>Private Key</Typography>
                  <Tooltip arrow title={props.privateKey}>
                    <Chip icon={<Key sx={{ fontSize: "14px !important" }} />} label="View" size="small" variant="outlined" clickable sx={{ fontSize: "0.72rem" }} />
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="contained" color="primary" size="small" startIcon={<MonetizationOn />}
                  onClick={() => setCreateModalOpen(true)} sx={{ textTransform: "none" }}>
                  Create Token
                </Button>
                <Button variant="outlined" size="small" startIcon={<Link />}
                  onClick={() => setAssociateModalOpen(true)} sx={{ textTransform: "none" }}>
                  Associate Token
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Loading */}
        {loading && (
          <Grid item xs={12} sx={{ textAlign: "center" }}>
            <CircularProgress size={28} />
          </Grid>
        )}

        {/* Token cards */}
        {tokenList}
      </Grid>

      {/* Create Token Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Create Fungible Token</Typography>
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Token Name" fullWidth variant="outlined" size="small" inputRef={tokenNameRef} />
            <TextField label="Token Symbol" fullWidth variant="outlined" size="small" inputRef={tokenSymbolRef} />
            <TextField label="Decimals" fullWidth variant="outlined" size="small" inputRef={decimalRef} type="number" />
            <TextField label="Initial Supply" fullWidth variant="outlined" size="small" inputRef={totalSupplyRef} type="number" />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setCreateModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Create />} onClick={createToken} sx={{ textTransform: "none" }}>Create</Button>
          </Box>
        </Box>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Transfer Token</Typography>
            {selectedToken.token_id && (
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {selectedToken.token_id?.toString()} ({tokenInfo[selectedToken.token_id?.toString()]?.symbol})
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Receiver's Account ID" fullWidth variant="outlined" size="small" inputRef={accountRef} />
            <TextField label="Amount" fullWidth variant="outlined" size="small" inputRef={amountRef} type="number" />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setTransferModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Send />} onClick={transferToken} sx={{ textTransform: "none" }}>Send</Button>
          </Box>
        </Box>
      </Modal>

      {/* Associate Modal */}
      <Modal open={associateModalOpen} onClose={() => setAssociateModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Associate Token</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <TextField label="Token ID" fullWidth variant="outlined" size="small" inputRef={tokenIdRef} />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setAssociateModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Link />} onClick={associateToken} sx={{ textTransform: "none" }}>Associate</Button>
          </Box>
        </Box>
      </Modal>

      {/* Mint Modal */}
      <Modal open={mintModalOpen} onClose={() => setMintModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Mint Tokens</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <TextField label="Amount to mint" fullWidth variant="outlined" size="small" inputRef={mintAmountRef} type="number" />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setMintModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<Money />} onClick={mintToken} sx={{ textTransform: "none" }}>Mint</Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default FungibleToken;
