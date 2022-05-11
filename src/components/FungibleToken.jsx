import React, { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
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
  TokenDeleteTransaction,
  TokenInfoQuery,
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
  MonetizationOn,
  Money,
  Send,
} from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Modal,
  Snackbar,
  TextField,
  Tooltip,
} from "@mui/material";
import { Box } from "@mui/system";

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

const FungibleToken = (props) => {
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
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });

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
      const account = await new AccountInfoQuery()
        .setAccountId(props.accountId)
        .execute(props.client);
      let tokenRelationships = [];
      let tokenInfo = {};
      setLoading(true);
      for (const [tokenId, token] of account.tokenRelationships) {
        const query = new TokenInfoQuery().setTokenId(tokenId);
        tokenInfo[tokenId.toString()] = await query.execute(props.client);
        tokenRelationships.push(token);
      }
      setTokenInfo(tokenInfo);
      setTokens(tokenRelationships);
      setLoading(false);
    };
    fetchAccount();
    setSigKey(PrivateKey.fromString(props.privateKey));
  }, [props.accountId, props.client, props.privateKey, refreshCount]);

  const transferToken = async () => {
    setBackdropOpen(true);
    try {
      const amount = parseInt(amountRef.current?.value);
      const receiverAccount = accountRef.current?.value;
      const transaction = await new TransferTransaction()
        .addTokenTransfer(selectedToken.tokenId, props.accountId, -amount)
        .addTokenTransfer(selectedToken.tokenId, receiverAccount, amount)
        .freezeWith(props.client);
      const signTx = await transaction.sign(sigKey);
      const txResponse = await signTx.execute(props.client);
      await txResponse.getReceipt(props.client);

      setSnackbar({
        message: "Tokens transfered successfully",
        severity: "success",
        open: false,
      });
      setTransferModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to transfer token " + err.toString(),
        severity: "error",
        open: false,
      });
    }
    setBackdropOpen(false);
  };

  const mintToken = async () => {
    setBackdropOpen(true);
    try {
      const tx = await new TokenMintTransaction()
        .setTokenId(selectedToken.tokenId)
        .setAmount(parseInt(mintAmountRef.current?.value))
        .freezeWith(props.client);
      const signedTx = await tx.sign(sigKey);
      await signedTx.execute(props.client);
      setSnackbar({
        message: "Tokens minted successfully",
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

  const deleteToken = async (token) => {
    const transaction = await new TokenDeleteTransaction()
      .setTokenId(token.tokenId.toString())
      .freezeWith(props.client);
    const signTx = await transaction.sign(sigKey);
    const txResponse = await signTx.execute(props.client);
    const receipt = await txResponse.getReceipt(props.client);
    const transactionStatus = receipt.status;
    console.log(
      "The transaction consensus status " + transactionStatus.toString()
    );
  };

  const tokenList = tokens
    .filter(
      (token) =>
        tokenInfo[token.tokenId.toString()].tokenType !==
        TokenType.NonFungibleUnique
    )
    .map((token) => {
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
                {tokenInfo[token.tokenId.toString()]?.isDeleted?.toString()}
              </div>
              <div>
                <b>TokenType:</b>{" "}
                {tokenInfo[token.tokenId.toString()]?.tokenType?.toString()}
              </div>
              <hr />
              <div>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<Send />}
                  color="secondary"
                  onClick={() => {
                    setTransferModalOpen(true);
                    setSelectedToken(token);
                  }}
                >
                  Transfer
                </Button>{" "}
                {tokenInfo[token.tokenId.toString()]?.adminKey?.toString() ===
                  props.publicKey && (
                  <span>
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<Money />}
                      color="secondary"
                      onClick={() => {
                        setSelectedToken(token);
                        setMintModalOpen(true);
                      }}
                    >
                      Mint
                    </Button>{" "}
                    <IconButton
                      color="error"
                      onClick={() => deleteToken(token)}
                      style={{ float: "right" }}
                    >
                      <Delete />
                    </IconButton>
                  </span>
                )}
              </div>
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
      setSnackbar({
        message: "Associate token success!",
        severity: "success",
        open: true,
      });
      setAssociateModalOpen(false);
      setRefreshCount(refreshCount + 1);
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
      //SIGN WITH TREASURY KEY
      let tokenCreateSign = await tokenCreateTx.sign(sigKey);
      //SUBMIT THE TRANSACTION
      let tokenCreateSubmit = await tokenCreateSign.execute(props.client);
      //GET THE TRANSACTION RECEIPT
      let tokenCreateRx = await tokenCreateSubmit.getReceipt(props.client);
      let tokenId = tokenCreateRx.tokenId;
      setSnackbar({
        message: "Create token success, tokenID: " + tokenId,
        severity: "success",
        open: true,
      });
      setCreateModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn("Create token failed", err);
      setSnackbar({
        message: "Failed to create token " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  return (
    <div>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1000 }}
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
        <CurrencyExchange fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>Fungible Token</b>
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
                startIcon={<MonetizationOn />}
                color="secondary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create Token
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
              <TextField
                id="Decimal"
                name="Decimal"
                label="Decimal"
                fullWidth
                variant="standard"
                inputRef={decimalRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="TotalSupply"
                name="TotalSupply"
                label="Total supply"
                fullWidth
                variant="standard"
                inputRef={totalSupplyRef}
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
              <b>Token:</b> {selectedToken.tokenId?.toString()} (
              {selectedToken.symbol?.toString()})
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="AccountID"
                name="AccountID"
                label="Reciever's AccountID"
                fullWidth
                variant="standard"
                inputRef={accountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="Amount"
                name="Amount"
                label="Amount"
                fullWidth
                variant="standard"
                inputRef={amountRef}
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
                id="MintAmount"
                name="MintAmount"
                label="Token amount to be minted"
                fullWidth
                variant="standard"
                inputRef={mintAmountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Money />}
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
    </div>
  );
};

export default FungibleToken;
