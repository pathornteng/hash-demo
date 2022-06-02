import React, { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import { Buffer } from "buffer";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  AccountBalanceQuery,
  AccountInfoQuery,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  PrivateKey,
  TokenAssociateTransaction,
  TransferTransaction,
  TokenMintTransaction,
  TokenNftInfoQuery,
  NftId,
} from "@hashgraph/sdk";
import {
  BrowseGallery,
  Category,
  Close,
  Collections,
  Create,
  Key,
  Link,
  Send,
} from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Modal,
  Snackbar,
  TextField,
  Tooltip,
} from "@mui/material";
import { Box } from "@mui/system";
import MirrorNodeAPI from "../api/mirror-node-api";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

const NonFungibleToken = (props) => {
  const [hbarBalance, setHbarBalance] = useState("0");
  const [tokens, setTokens] = useState([]);
  const [tokenInfo, setTokenInfo] = useState({});
  const [selectedToken, setSelectedToken] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [nftModalOpen, setNftModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nft, setNft] = useState([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [sigKey, setSigKey] = useState();
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });

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
      const account = await new AccountInfoQuery()
        .setAccountId(props.accountId)
        .execute(props.client);
      let tokenRelationships = [];
      let tokenInfo = {};
      setLoading(true);
      for (const [tokenId, token] of account.tokenRelationships) {
        const query = await api.getToken(tokenId);
        tokenInfo[tokenId.toString()] = query.data;
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
        .addNftTransfer(
          nft.nftId?.tokenId,
          nft.nftId?.serial,
          props.accountId,
          accountRef.current?.value
        )
        .freezeWith(props.client)
        .sign(sigKey);
      await tokenTransferTx.execute(props.client);
      setTransferModalOpen(false);
      setSnackbar({
        message: "NFT's transfered successfully",
        severity: "success",
        open: true,
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to transfer NFT " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const mintToken = async () => {
    setBackdropOpen(true);
    try {
      let mintTx = await new TokenMintTransaction()
        .setTokenId(selectedToken.tokenId)
        .setMetadata([Buffer.from(CIDRef.current?.value)])
        .freezeWith(props.client);
      let mintTxSign = await mintTx.sign(sigKey);
      let mintTxSubmit = await mintTxSign.execute(props.client);
      await mintTxSubmit.getReceipt(props.client);
      setSnackbar({
        message: "NFT is minted successfully",
        severity: "success",
        open: true,
      });
      setMintModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to mint token " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const getNft = async (token, index) => {
    try {
      const nftId = new NftId(
        token.tokenId,
        parseInt(serialRefs.current[index]?.value)
      );
      let nfts = await new TokenNftInfoQuery()
        .setNftId(nftId)
        .execute(props.client);
      setNft(nfts[0]);
      setNftModalOpen(true);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to get Nft " + err.toString(),
        severity: "error",
        open: true,
      });
    }
  };

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

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
      setSnackbar({
        message: "Token association is created successfully",
        severity: "success",
        open: true,
      });
      setAssociateModalOpen(false);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to associate token " + err.toString(),
        severity: "error",
        open: true,
      });
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
      let tokenId = tokenCreateRx.tokenId;
      await delay(10000);
      setSnackbar({
        open: true,
        message: "NFT is created successfully, tokenID: " + tokenId,
        severity: "success",
      });
      setCreateModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        open: true,
        message: "Failed to create NFT " + err.toString(),
        severity: "error",
      });
    }
    setBackdropOpen(false);
  };

  const handleTransferClick = () => {
    setTransferModalOpen(true);
    setNftModalOpen(false);
  };

  const tokenList = tokens
    .filter(
      (token) =>
        tokenInfo[token.tokenId.toString()].type === "NON_FUNGIBLE_UNIQUE"
    )
    .map((token, index) => {
      return (
        <Grid item xs={6} key={token.tokenId.toString()}>
          <Card sx={{ minWidth: 150 }}>
            <CardContent>
              <div>
                <b>TokenID:</b>{" "}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    "https://hashscan.io/#/testnet/token/" +
                    token.tokenId.toString()
                  }
                >
                  {token.tokenId.toString()}
                </a>
              </div>
              <div>
                <b>Name:</b>{" "}
                {tokenInfo[token.tokenId.toString()]?.name?.toString()}
              </div>
              <div>
                <b>Symbol:</b> {token.symbol.toString()}
              </div>
              <div>
                <b>Balance:</b> {token.balance.toString()}
              </div>
              <div>
                <b>IsDeleted:</b>{" "}
                {tokenInfo[token.tokenId.toString()]?.deleted?.toString()}
              </div>
              <div>
                <b>TokenType:</b>{" "}
                {tokenInfo[token.tokenId.toString()]?.type?.toString()}
              </div>
              <hr />
              <div>
                <TextField
                  id="outlined-basic"
                  label="Serial"
                  variant="standard"
                  size="small"
                  style={{ width: "100px" }}
                  inputRef={(element) => {
                    serialRefs.current[index] = element;
                  }}
                />{" "}
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<Collections />}
                  color="secondary"
                  onClick={() => getNft(token, index)}
                >
                  View
                </Button>{" "}
                {tokenInfo[token.tokenId.toString()]?.adminKey?.toString() ===
                  props.publicKey && (
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Collections />}
                    color="secondary"
                    style={{ float: "right" }}
                    onClick={() => {
                      setMintModalOpen(true);
                      setSelectedToken(token);
                    }}
                  >
                    Mint
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
      );
    });

  return (
    <div>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 200 }}
        open={backdropOpen}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        autoHideDuration={3000}
        open={snackbar.open}
        severity={snackbar.severity}
        onClose={() =>
          setSnackbar({
            open: false,
            message: snackbar.message,
            severity: snackbar.severity,
          })
        }
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Typography gutterBottom variant="h5" component="div">
        <Category fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>NonFungible Token</b>
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Account ID:</b>{" "}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    "https://hashscan.io/#/testnet/account/" + props.accountId
                  }
                >
                  {props.accountId}
                </a>
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Public Key:</b> {props.publicKey}
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Private Key:</b>{" "}
                <Tooltip arrow title={props.privateKey}>
                  <IconButton>
                    <Key />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Hbar:</b> {hbarBalance}
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<Category />}
                color="secondary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create NFT
              </Button>{" "}
              <Button
                variant="contained"
                component="label"
                startIcon={<Link />}
                color="secondary"
                onClick={() => setAssociateModalOpen(true)}
                ml={5}
              >
                Associate Token
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          item
          xs={12}
          style={{ textAlign: "center", display: loading ? "block" : "none" }}
        >
          <CircularProgress />
        </Grid>
        {tokenList}
      </Grid>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="TokenName"
                name="TokenName"
                label="Token Name"
                fullWidth
                variant="standard"
                inputRef={tokenNameRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="TokenSymbol"
                name="TokenSymbol"
                label="Token Symbol"
                fullWidth
                variant="standard"
                inputRef={tokenSymbolRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Create />}
                color="secondary"
                onClick={createToken}
              >
                Create
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setCreateModalOpen(false)}
              >
                Close
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div>
                <b>Token:</b> {nft?.nftId?.tokenId.toString()}
              </div>
              <div>
                <b>Serial:</b> {nft?.nftId?.serial.toString()}
              </div>
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="ReceiverAccountID"
                name="ReceiverAccountID"
                label="Receiver's account id"
                fullWidth
                variant="standard"
                inputRef={accountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={transferToken}
              >
                Send
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setTransferModalOpen(false)}
              >
                Close
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Modal
        open={associateModalOpen}
        onClose={() => setAssociateModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="TokenID"
                name="TokenID"
                label="TokenID to be associated"
                fullWidth
                variant="standard"
                inputRef={tokenIdRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={associateToken}
              >
                Link
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setAssociateModalOpen(false)}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Modal
        open={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="CID"
                name="CID"
                label="CID of metadata on IPFS"
                fullWidth
                variant="standard"
                inputRef={CIDRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<BrowseGallery />}
                color="secondary"
                onClick={mintToken}
              >
                Mint
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setMintModalOpen(false)}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Dialog
        open={nftModalOpen}
        onClose={() => setNftModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Non Fungible Token Detail"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText component={"span"} id="alert-dialog-description">
            <div>
              <b>TokenID:</b> {nft.nftId?.tokenId?.toString()}
            </div>
            <div>
              <b>Serial:</b> {nft.nftId?.serial?.toString()}
            </div>
            <div>
              <b>Create at:</b>{" "}
              {new Date(nft.creationTime * 1000).toLocaleString()}
            </div>
            <div>
              <b>Owner AcccountID:</b> {nft.accountId?.toString()}
            </div>
            <div style={{ overflowWrap: "break-word" }}>
              <b>Metadata:</b> {new TextDecoder().decode(nft.metadata)}
            </div>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {props.accountId === nft.accountId?.toString() && (
            <Button
              variant="contained"
              component="label"
              startIcon={<BrowseGallery />}
              color="secondary"
              onClick={handleTransferClick}
            >
              Transfer
            </Button>
          )}
          <Button
            variant="contained"
            component="label"
            startIcon={<Close />}
            color="error"
            style={{ float: "right" }}
            onClick={() => setNftModalOpen(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default NonFungibleToken;
