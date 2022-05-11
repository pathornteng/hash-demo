import React, { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  AccountBalanceQuery,
  TransferTransaction,
  Hbar,
  AccountInfoQuery,
  PrivateKey,
  AccountCreateTransaction,
} from "@hashgraph/sdk";
import {
  AccountBalanceWallet,
  Add,
  Close,
  Delete,
  Download,
  Key,
  MonetizationOn,
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

const Account = (props) => {
  const [hbarBalance, setHbarBalance] = useState("0");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [accountInfo, setAccountInfo] = useState({});
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
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

  useEffect(() => {
    const fetchBalance = async () => {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(props.account.accountId)
        .execute(props.client);
      setHbarBalance(accountBalance.hbars.toString());
    };
    fetchBalance();
  }, [props.account, props.client, refreshCount]);

  const transfer = async () => {
    setBackdropOpen(true);
    setTransferModalOpen(false);
    try {
      const sendHbar = await new TransferTransaction()
        .addHbarTransfer(
          props.account.accountId,
          Hbar.from(-amountRef.current.value)
        ) //Sending account
        .addHbarTransfer(
          accountRef.current.value,
          Hbar.from(amountRef.current.value)
        ) //Receiving account
        .execute(props.client);

      const transactionReceipt = await sendHbar.getReceipt(props.client);
      console.log(
        "The transfer transaction from my account to the new account was: " +
          transactionReceipt.status.toString()
      );
      setSnackbar({
        message: "Transaction succeeded!",
        severity: "success",
        open: true,
      });
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn("Transfer token error", err);
      setSnackbar({
        message: "Transaction failed! " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const createAccount = async () => {
    setBackdropOpen(true);
    try {
      const newAccountPrivateKey = await PrivateKey.generateED25519();
      const newAccountPublicKey = newAccountPrivateKey.publicKey;
      const createAccountTx = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromString(initBalanceRef.current?.value))
        .execute(props.client);
      console.log(createAccountTx.transactionHash.toString());
      console.log(createAccountTx.transactionId.toString());
      const getReceipt = await createAccountTx.getReceipt(props.client);
      console.log(getReceipt);
      const newAccountId = getReceipt.accountId;
      const newAccount = {
        name: accountNameRef.current?.value,
        accountId: newAccountId.toString(),
        privateKey: newAccountPrivateKey.toString(),
        publicKey: newAccountPublicKey.toString(),
      };
      const accountList = [...props.accounts, newAccount];
      props.setAccounts(accountList);
      localStorage.setItem("accounts", JSON.stringify(accountList));
      setSnackbar({
        message: "A new account is created!",
        severity: "success",
        open: true,
      });
      setCreateAccountModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Creating new account failed " + err.toString(),
        severity: "error",
        open: true,
      });
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

      setSnackbar({
        message: "Deleted account successfully",
        severity: "success",
        open: true,
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to delete account " + err.toString(),
        severity: "error",
        open: true,
      });
    }
  };

  const fetchAccount = async () => {
    setBackdropOpen(true);
    try {
      const accountInfo = await new AccountInfoQuery()
        .setAccountId(fetchAccountRef.current?.value)
        .execute(props.client);

      setAccountInfo({
        information: accountInfo,
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        severity: "error",
        message: "Failed to fetch account " + err.toString(),
        open: true,
      });
    }
    setBackdropOpen(false);
  };

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
        <AccountBalanceWallet fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>Account</b>
      </Typography>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Account ID:</b>{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href={
                "https://hashscan.io/#/testnet/account/" +
                props.account.accountId
              }
            >
              {props.account.accountId}
            </a>
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Public Key:</b> {props.account.publicKey}
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Private Key:</b>{" "}
            <Tooltip arrow title={props.account.privateKey}>
              <IconButton>
                <Key />
              </IconButton>
            </Tooltip>
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Hbar:</b> {hbarBalance}
          </Typography>
          <Button
            variant="contained"
            component="label"
            startIcon={<MonetizationOn />}
            color="secondary"
            onClick={() => setTransferModalOpen(true)}
          >
            Transfer
          </Button>{" "}
          <Button
            variant="contained"
            component="label"
            startIcon={<Add />}
            color="secondary"
            onClick={() => setCreateAccountModalOpen(true)}
          >
            Create Account
          </Button>
          {!props.account.isMainAccount && (
            <IconButton
              color="error"
              onClick={() => deleteAccount()}
              style={{ float: "right" }}
            >
              <Delete />
            </IconButton>
          )}
        </CardContent>
      </Card>

      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
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
                label="Amount (Hbar)"
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
                onClick={transfer}
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
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>

      <Modal
        open={createAccountModalOpen}
        onClose={() => setCreateAccountModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="AccountName"
                name="AccountName"
                label="Account Name"
                fullWidth
                variant="standard"
                inputRef={accountNameRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="InitialBalance"
                name="InitialBalance"
                label="Initial balance (Hbar)"
                fullWidth
                variant="standard"
                inputRef={initBalanceRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={() => {
                  createAccount();
                }}
              >
                Create
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setCreateAccountModalOpen(false)}
              >
                Close
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
      <br />
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            <b>Get Account Info</b>
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="AccountID"
                name="AccountID"
                label="Account ID"
                fullWidth
                variant="standard"
                inputRef={fetchAccountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Download />}
                color="secondary"
                onClick={fetchAccount}
              >
                Fetch
              </Button>
            </Grid>
            <Grid item xs={12}>
              {accountInfo.information != null && (
                <div>
                  <div>
                    <b>AccountID:</b>{" "}
                    {accountInfo.information?.accountId?.toString()}
                  </div>
                  <div>
                    <b>Balance:</b>{" "}
                    {accountInfo.information?.balance?.toString()}
                  </div>
                  <div>
                    <b>IsDeleted:</b>{" "}
                    {accountInfo.information?.isDeleted?.toString()}
                  </div>
                  <div>
                    <b>ProxyAccountID:</b>{" "}
                    {accountInfo.information?.proxyAccountId?.toString()}
                  </div>
                  <div>
                    <b>ProxyReceived:</b>{" "}
                    {accountInfo.information?.proxyReceived?.toString()}
                  </div>
                  <div>
                    <b>ProxyReceived:</b>{" "}
                    {accountInfo.information?.proxyReceived?.toString()}
                  </div>
                  <div>
                    <b>PublicKey:</b> {accountInfo.information?.key?.toString()}
                  </div>
                  <div>
                    <b>SendRecordThreshold:</b>{" "}
                    {accountInfo.information?.sendRecordThreshold?.toString()}
                  </div>
                  <div>
                    <b>ReceiveRecordThreshold:</b>{" "}
                    {accountInfo.information?.receiveRecordThreshold?.toString()}
                  </div>
                  <div>
                    <b>ReceiveRecordThreshold:</b>{" "}
                    {accountInfo.information?.receiveRecordThreshold?.toString()}
                  </div>
                  <div>
                    <b>IsReceiverSignatureRequired:</b>{" "}
                    {accountInfo.information?.isReceiverSignatureRequired?.toString()}
                  </div>
                  <div>
                    <b>Expiration:</b>{" "}
                    {new Date(
                      Math.round(
                        accountInfo.information?.expirationTime?.toString()
                      ) * 1000
                    ).toLocaleString()}
                  </div>
                  <div>
                    <b>AutoRenewPeriod:</b>{" "}
                    {accountInfo.information?.autoRenewPeriod?.seconds.toString()}{" "}
                    seconds
                  </div>
                  <div>
                    <b>AccountMemo:</b>{" "}
                    {accountInfo.information?.accountMemo?.toString()}
                  </div>
                </div>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;
