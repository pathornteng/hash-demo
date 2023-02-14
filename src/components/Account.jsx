import React, { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  TransactionId,
  Hbar,
  AccountUpdateTransaction,
  TransferTransaction,
  AccountId,
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
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Select,
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
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [accountInfo, setAccountInfo] = useState({});
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
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
  const keyTypeRef = useRef();
  const stakeAccountRef = useRef();

  useEffect(() => {
    const hashconnect = props.wallet[0];
    const saveData = props.wallet[1];
    console.log("-----------", saveData);
    const provider = hashconnect.getProvider(
      "testnet",
      saveData.topic,
      saveData.pairedAccount
    );
    const fetchBalance = async () => {
      let accountBalance = await provider.getAccountBalance(
        saveData.pairedAccount
      );
      setHbarBalance(accountBalance.hbars.toString());
    };
    fetchBalance();
  }, [props.wallet, refreshCount, privateKey]);

  const stake = async () => {
    setBackdropOpen(true);
    try {
      const updateAccountTx = new AccountUpdateTransaction()
        .setAccountId(props.wallet[1].pairedAccount)
        .setStakedAccountId(stakeAccountRef.current?.value);
      const transId = TransactionId.generate(props.wallet[1].pairedAccount);
      updateAccountTx.setTransactionId(transId);
      updateAccountTx.setNodeAccountIds([new AccountId(3)]);
      updateAccountTx.freeze();

      const response = await props.wallet[0].sendTransaction(
        props.wallet[1].topic,
        {
          topic: props.wallet[1].topic,
          byteArray: updateAccountTx.toBytes(),
          metadata: {
            accountToSign: props.wallet[1].pairedAccount,
            returnTransaction: false,
          },
        }
      );
      console.log(response);

      setSnackbar({
        message: "Staking succeeded!",
        severity: "success",
        open: true,
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Staking failed!" + err.toString(),
        severity: "error",
        open: true,
      });
    }

    setBackdropOpen(false);
  };

  const transfer = async () => {
    setBackdropOpen(true);
    setTransferModalOpen(false);
    try {
      const sendHbarTx = await new TransferTransaction()
        .addHbarTransfer(
          props.wallet[1].pairedAccount,
          Hbar.from(-amountRef.current.value)
        )
        .addHbarTransfer(
          accountRef.current.value,
          Hbar.from(amountRef.current.value)
        );
      const transId = TransactionId.generate(props.wallet[1].pairedAccount);
      sendHbarTx.setTransactionId(transId);
      sendHbarTx.setNodeAccountIds([new AccountId(3)]);
      sendHbarTx.freeze();

      const response = await props.wallet[0].sendTransaction(
        props.wallet[1].topic,
        {
          topic: props.wallet[1].topic,
          byteArray: sendHbarTx.toBytes(),
          metadata: {
            accountToSign: props.wallet[1].pairedAccount,
            returnTransaction: false,
          },
        }
      );
      console.log(response);

      const transactionReceipt = response.receipt;
      console.log(
        "The transfer transaction from my account to the new account was: " +
          transactionReceipt
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

  const fetchAccount = async () => {
    setBackdropOpen(true);
    try {
      const accountInfo = await props.api.getAccount(
        fetchAccountRef.current?.value
      );
      console.log(accountInfo.data);

      setAccountInfo({
        information: accountInfo.data,
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
                "https://hashscan.io/testnet/account/" +
                props.wallet[1].pairedAccount
              }
            >
              {props.wallet[1].pairedAccount}
            </a>
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Public Key:</b>
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Private Key:</b> Der:
            <Tooltip arrow title="PrivateKey">
              <IconButton>
                <Key />
              </IconButton>
            </Tooltip>
            Raw:
            <Tooltip arrow title="PrivateKey">
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
            startIcon={<MoneyOff />}
            color="secondary"
            onClick={() => setStakeModalOpen(true)}
          >
            Stake
          </Button>
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

      <br />
      <Modal
        open={stakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="AccountId"
                name="AccountId"
                label="Account Id"
                fullWidth
                variant="standard"
                inputRef={stakeAccountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={() => {
                  stake();
                }}
              >
                Stake
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setStakeModalOpen(false)}
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
                    <b>AccountID:</b> {accountInfo.information?.account}
                  </div>
                  <div>
                    <b>Balance:</b>{" "}
                    {Hbar.fromTinybars(
                      accountInfo.information?.balance?.balance
                    ).toString()}
                  </div>
                  <div>
                    <b>Tokens:</b>{" "}
                    <pre>
                      {JSON.stringify(
                        accountInfo.information?.balance?.tokens,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <div>
                    <b>Alias:</b> {accountInfo.information?.alias}
                  </div>
                  <div>
                    <b>Deleted:</b>{" "}
                    {accountInfo.information?.deleted?.toString()}
                  </div>
                  <div>
                    <b>Keys:</b>{" "}
                    <pre>
                      {JSON.stringify(accountInfo.information?.key, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <b>Expiration:</b>{" "}
                    {accountInfo.information?.expiry_timestamp}
                  </div>
                  <div>
                    <b>Auto Renew Period:</b>{" "}
                    {accountInfo.information?.auto_renew_period}
                  </div>
                  <div>
                    <b>EVM Address:</b> {accountInfo.information?.evm_address}
                  </div>
                  <div>
                    <b>Account Memo:</b> {accountInfo.information?.memo}
                  </div>
                  <div>
                    <b>Staked Account ID:</b>{" "}
                    {accountInfo.information?.staked_account_id}
                  </div>
                  <div>
                    <b>Staked Node ID:</b>{" "}
                    {accountInfo.information?.staked_node_id}
                  </div>
                  <div>
                    <b>Staked Period Start:</b>{" "}
                    {accountInfo.information?.stake_period_start}
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
