import React, { useState, useEffect, useRef } from "react";
import { Buffer } from "buffer";
import {
  AccountBalanceQuery,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  PrivateKey,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  TransferTransaction,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import {
  BrowseGallery,
  Category,
  Close,
  Collections,
  Create,
  Key,
  Link,
  LinkOff,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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

const NonFungibleToken = (props) => {
  const mirrorNodeDelay = 4000;
  const [hbarBalance, setHbarBalance] = useState("0");
  const [tokens, setTokens] = useState([]);
  const [tokenInfo, setTokenInfo] = useState({});
  const [selectedToken, setSelectedToken] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [dissociateModalOpen, setDissociateModalOpen] = useState(false);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nft, setNft] = useState([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [sigKey, setSigKey] = useState();
  const [snackbar, setSnackbar] = useState({ message: "", severity: "success", open: false });

  const accountRef = useRef();
  const tokenNameRef = useRef();
  const tokenSymbolRef = useRef();
  const tokenIdRef = useRef();
  const CIDRef = useRef();
  const serialRefs = useRef([]);

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
        tokenInfo[token.token_id.toString()] = query.data;
        tokenRelationships.push(token);
      }
      setLoading(false);
      setTokenInfo(tokenInfo);
      setTokens(tokenRelationships);
    };
    fetchAccount();
    setSigKey(PrivateKey.fromString(props.privateKey));
  }, [props.accountId, props.client, props.privateKey, refreshCount]);

  const transferToken = async () => {
    setBackdropOpen(true);
    try {
      let tokenTransferTx = await new TransferTransaction()
        .addNftTransfer(nft.token_id, nft.serial_number, props.accountId, accountRef.current?.value)
        .freezeWith(props.client)
        .sign(sigKey);
      const txResponse = await tokenTransferTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setTransferModalOpen(false);
      setSnackbar({ message: "NFT transferred successfully", severity: "success", open: true });
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to transfer NFT: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const mintToken = async () => {
    setBackdropOpen(true);
    try {
      let mintTx = await new TokenMintTransaction()
        .setTokenId(selectedToken.token_id)
        .setMetadata([Buffer.from(CIDRef.current?.value)])
        .freezeWith(props.client);
      let mintTxSign = await mintTx.sign(sigKey);
      let mintTxSubmit = await mintTxSign.execute(props.client);
      await mintTxSubmit.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "NFT minted successfully", severity: "success", open: true });
      setMintModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ message: "Failed to mint NFT: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const getNft = async (token, index) => {
    try {
      const api = new MirrorNodeAPI();
      const resp = await api.getNft(token.token_id, parseInt(serialRefs.current[index]?.value));
      let nft = resp.data;
      nft.metadata = atob(nft.metadata);
      setNft(nft);
      setNftModalOpen(true);
    } catch (err) {
      setSnackbar({ message: "Failed to get NFT: " + err.toString(), severity: "error", open: true });
    }
  };

  const dissociate = async (token) => {
    nft.token_id = token.token_id;
    setNft(nft);
    setDissociateModalOpen(true);
  };

  const dissociateToken = async () => {
    setBackdropOpen(true);
    try {
      let dissociateTx = await new TokenDissociateTransaction()
        .setAccountId(props.accountId)
        .setTokenIds([nft.token_id]);
      let dissociateTxSubmit = await dissociateTx.execute(props.client);
      await dissociateTxSubmit.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Token dissociated successfully", severity: "success", open: true });
      setRefreshCount(refreshCount + 1);
      setDissociateModalOpen(false);
    } catch (err) {
      setSnackbar({ message: "Dissociation failed: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const associateToken = async () => {
    setBackdropOpen(true);
    try {
      let associateTx = await new TokenAssociateTransaction()
        .setAccountId(props.accountId)
        .setTokenIds([tokenIdRef.current?.value]);
      let associateTxSubmit = await associateTx.execute(props.client);
      await associateTxSubmit.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({ message: "Token associated successfully", severity: "success", open: true });
      setRefreshCount(refreshCount + 1);
      setAssociateModalOpen(false);
    } catch (err) {
      setSnackbar({ message: "Failed to associate token: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const createToken = async () => {
    setBackdropOpen(true);
    try {
      const sigKey = PrivateKey.fromString(props.privateKey);
      const tokenName = tokenNameRef.current?.value;
      const tokenSymbol = tokenSymbolRef.current?.value;
      let tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol(tokenSymbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(props.accountId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(sigKey)
        .setAdminKey(sigKey)
        .freezeWith(props.client);
      let tokenCreateSign = await tokenCreateTx.sign(sigKey);
      let tokenCreateSubmit = await tokenCreateSign.execute(props.client);
      let tokenCreateRx = await tokenCreateSubmit.getReceipt(props.client);
      let tokenId = tokenCreateRx.token_id;
      await delay(mirrorNodeDelay);
      setSnackbar({ open: true, message: "NFT created! ID: " + tokenId, severity: "success" });
      setCreateModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to create NFT: " + err.toString(), severity: "error" });
    }
    setBackdropOpen(false);
  };

  const handleTransferClick = () => {
    setTransferModalOpen(true);
    setNftModalOpen(false);
  };

  const tokenList = tokens
    .filter((token) => tokenInfo[token.token_id.toString()]?.type === "NON_FUNGIBLE_UNIQUE")
    .map((token, index) => {
      const info = tokenInfo[token.token_id.toString()];
      const isTreasury = info?.treasury_account_id?.toString() === props.accountId;
      const isAdmin =
        info?.admin_key?.key?.toString() ===
        PrivateKey.fromString(props.privateKey).publicKey.toStringRaw();
      const canDissociate =
        (!isTreasury && info?.balance === 0) || info?.deleted;

      return (
        <Grid item xs={12} sm={6} key={token.token_id?.toString()}>
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
                    <a target="_blank" rel="noreferrer" href={"https://hashscan.io/testnet/token/" + token.token_id?.toString()}>
                      {token.token_id.toString()}
                    </a>
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>Balance</Typography>
                    <Typography variant="body2" fontWeight={600}>{info?.balance?.toString()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>Supply</Typography>
                    <Typography variant="body2">{info?.total_supply?.toString()} / {info?.max_supply?.toString()}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>Treasury</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                      {info?.treasury_account_id?.toString()}
                    </Typography>
                    {isTreasury && <Chip label="you" size="small" sx={{ fontSize: "0.62rem", height: 16 }} />}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <TextField
                  label="Serial"
                  variant="outlined"
                  size="small"
                  sx={{ width: 90 }}
                  inputRef={(el) => { serialRefs.current[index] = el; }}
                />
                <Button variant="outlined" size="small" startIcon={<Collections />}
                  onClick={() => getNft(token, index)} sx={{ textTransform: "none" }}>
                  View
                </Button>
                {isAdmin && (
                  <Button variant="contained" color="primary" size="small" startIcon={<Collections />}
                    onClick={() => { setMintModalOpen(true); setSelectedToken(token); }}
                    sx={{ textTransform: "none" }}>
                    Mint
                  </Button>
                )}
                {canDissociate && (
                  <Button variant="outlined" size="small" color="error" startIcon={<LinkOff />}
                    onClick={() => dissociate(token)} sx={{ textTransform: "none", ml: "auto" }}>
                    Dissociate
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      );
    });

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
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Category fontSize="small" />
        <Typography variant="h5" fontWeight={700}>Non-Fungible Token</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Account summary */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Account</Typography>
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
                <Button variant="contained" color="primary" size="small" startIcon={<Category />}
                  onClick={() => setCreateModalOpen(true)} sx={{ textTransform: "none" }}>
                  Create NFT
                </Button>
                <Button variant="outlined" size="small" startIcon={<Link />}
                  onClick={() => setAssociateModalOpen(true)} sx={{ textTransform: "none" }}>
                  Associate Token
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {loading && (
          <Grid item xs={12} sx={{ textAlign: "center" }}>
            <CircularProgress size={28} />
          </Grid>
        )}

        {tokenList}
      </Grid>

      {/* Create NFT Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Create NFT Collection</Typography>
          </Box>
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Token Name" fullWidth variant="outlined" size="small" inputRef={tokenNameRef} />
            <TextField label="Token Symbol" fullWidth variant="outlined" size="small" inputRef={tokenSymbolRef} />
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
            <Typography variant="subtitle1" fontWeight={700}>Transfer NFT</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
              {nft?.token_id?.toString()} #{nft?.serial_number?.toString()}
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <TextField label="Receiver's Account ID" fullWidth variant="outlined" size="small" inputRef={accountRef} />
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

      {/* Dissociate Confirmation */}
      <Dialog open={dissociateModalOpen} onClose={() => setDissociateModalOpen(false)}>
        <DialogTitle fontWeight={700}>Dissociate Token?</DialogTitle>
        <DialogContent>
          <DialogContentText component="span">
            <Typography variant="body2" color="text.secondary" gutterBottom>
              You are about to dissociate:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
              {nft.token_id?.toString()}
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setDissociateModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" color="error" size="small" startIcon={<LinkOff />} onClick={dissociateToken} sx={{ textTransform: "none" }}>Dissociate</Button>
        </DialogActions>
      </Dialog>

      {/* Mint Modal */}
      <Modal open={mintModalOpen} onClose={() => setMintModalOpen(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="subtitle1" fontWeight={700}>Mint NFT</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <TextField label="IPFS CID (metadata)" fullWidth variant="outlined" size="small" inputRef={CIDRef} />
          </Box>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setMintModalOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="primary" size="small" startIcon={<BrowseGallery />} onClick={mintToken} sx={{ textTransform: "none" }}>Mint</Button>
          </Box>
        </Box>
      </Modal>

      {/* NFT Detail Dialog */}
      <Dialog open={nftModalOpen} onClose={() => setNftModalOpen(false)}>
        <DialogTitle fontWeight={700}>NFT Detail</DialogTitle>
        <DialogContent>
          <DialogContentText component="span">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 300 }}>
              {[
                ["Token ID", nft.token_id?.toString()],
                ["Serial", nft.serial_number?.toString()],
                ["Created", nft.created_timestamp ? new Date(nft.created_timestamp * 1000).toLocaleString() : null],
                ["Owner Account ID", nft.account_id?.toString()],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{value}</Typography>
                  </Box>
                ))}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                  Metadata
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{nft.metadata}</Typography>
              </Box>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          {props.accountId === nft.account_id?.toString() && (
            <Button variant="contained" color="primary" size="small" startIcon={<BrowseGallery />} onClick={handleTransferClick} sx={{ textTransform: "none" }}>
              Transfer
            </Button>
          )}
          <Button variant="outlined" size="small" startIcon={<Close />} onClick={() => setNftModalOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default NonFungibleToken;
