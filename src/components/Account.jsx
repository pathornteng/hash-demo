import React, { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
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
    const fetchBalance = async () => {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(props.account.accountId)
        .execute(props.client);
      setHbarBalance(accountBalance.hbars.toString());
    };
    const privateKey = PrivateKey.fromString(props.account.privateKey);
    setPrivateKey(privateKey.toStringRaw());
    fetchBalance();
  }, [props.account, props.client, refreshCount, privateKey]);

  const stake = async () => {
    setBackdropOpen(true);
    try {
      const txResponse = await new AccountUpdateTransaction()
        .setAccountId(props.account.accountId)
        .setStakedAccountId(stakeAccountRef.current?.value)
        .execute(props.client);

      //Request the receipt of the transaction
      const receipt = await txResponse.getReceipt(props.client);
      console.log(receipt);
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
      let newAccountPrivateKey;
      if (keyTypeRef.current.value === "ED25519") {
        newAccountPrivateKey = await PrivateKey.generateED25519();
      } else if (keyTypeRef.current.value === "SECP256K1") {
        newAccountPrivateKey = await PrivateKey.generateECDSA();
      }
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
                "https://hashscan.io/testnet/account/" + props.account.accountId
              }
            >
              {props.account.accountId}
            </a>
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Public Key:</b> {props.account.publicKey}
          </Typography>
          <Typography sx={{ fontSize: 16 }} color="text.secondary" gutterBottom>
            <b>Private Key:</b> Der:
            <Tooltip arrow title={props.account.privateKey}>
              <IconButton>
                <Key />
              </IconButton>
            </Tooltip>
            Raw:
            <Tooltip arrow title={privateKey}>
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
              <InputLabel id="key-type">Key Type</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                label="KeyType"
                defaultValue="ED25519"
                inputRef={keyTypeRef}
              >
                <MenuItem value="ED25519">ED25519</MenuItem>
                <MenuItem value="SECP256K1">SECP256K1</MenuItem>
              </Select>
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
