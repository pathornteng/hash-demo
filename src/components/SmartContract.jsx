import { useState, useRef } from "react";
import { Code, CloudUpload, Edit, QueryStats } from "@mui/icons-material";
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
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import {
  ContractCallQuery,
  ContractCreateTransaction,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  FileCreateTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import solidity from "react-syntax-highlighter/dist/esm/languages/prism/solidity";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
SyntaxHighlighter.registerLanguage("solidity", solidity);

const BYTECODE =
  "6080604052348015600e575f5ffd5b506101298061001c5f395ff3fe6080604052348015600e575f5ffd5b50600436106030575f3560e01c806360fe47b11460345780636d4ce63c14604c575b5f5ffd5b604a60048036038101906046919060a9565b6066565b005b6052606f565b604051605d919060dc565b60405180910390f35b805f8190555050565b5f5f54905090565b5f5ffd5b5f819050919050565b608b81607b565b81146094575f5ffd5b50565b5f8135905060a3816084565b92915050565b5f6020828403121560bb5760ba6077565b5b5f60c6848285016097565b91505092915050565b60d681607b565b82525050565b5f60208201905060ed5f83018460cf565b9291505056fea26469706673582212201038ddbc58e342ab090234706a02d89156409ec2d521d68fd639ba0fda2997bb64736f6c634300081f0033";

const SOLIDITY_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedData;

    function set(uint256 value) public {
        storedData = value;
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}`;

const SmartContract = (props) => {
  const [contract, setContract] = useState({});
  const [queryResult, setQueryResult] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });
  const [backdropOpen, setBackdropOpen] = useState(false);
  const inputRef = useRef();

  const deploy = async () => {
    setDeploying(true);
    setBackdropOpen(true);
    try {
      const transaction = await new FileCreateTransaction()
        .setKeys([props.client.operatorPublicKey])
        .setContents(BYTECODE)
        .setMaxTransactionFee(new Hbar(2))
        .freezeWith(props.client);
      const submitTx = await transaction.execute(props.client);
      const receipt = await submitTx.getReceipt(props.client);

      const contractInstantiateTx = new ContractCreateTransaction()
        .setBytecodeFileId(receipt.fileId)
        .setGas(200000);
      const contractInstantiateSubmit = await contractInstantiateTx.execute(
        props.client
      );
      const contractInstantiateRx =
        await contractInstantiateSubmit.getReceipt(props.client);
      const contractId = contractInstantiateRx.contractId;
      const contractAddress = contractId.toSolidityAddress();
      setContract({ contractId, contractAddress });
      setSnackbar({
        message: "Contract deployed successfully!",
        open: true,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        message: "Failed to deploy: " + err.toString(),
        open: true,
        severity: "error",
      });
    }
    setBackdropOpen(false);
    setDeploying(false);
  };

  const setData = async () => {
    setBackdropOpen(true);
    try {
      const contractExecuteTx = new ContractExecuteTransaction()
        .setContractId(contract.contractId)
        .setGas(100000)
        .setFunction(
          "set",
          new ContractFunctionParameters().addUint256(
            parseInt(inputRef.current?.value)
          )
        )
        .setMaxTransactionFee(new Hbar(1));
      const contractExecuteSubmit = await contractExecuteTx.execute(
        props.client
      );
      await contractExecuteSubmit.getReceipt(props.client);
      setSnackbar({
        message: "Value stored successfully",
        severity: "success",
        open: true,
      });
    } catch (err) {
      setSnackbar({
        message: "Failed to set value: " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const getData = async () => {
    setBackdropOpen(true);
    try {
      const contractQueryTx = new ContractCallQuery()
        .setContractId(contract.contractId)
        .setGas(100000)
        .setFunction("get")
        .setMaxQueryPayment(new Hbar(1));
      const transactionResult = await contractQueryTx.execute(props.client);
      setQueryResult(transactionResult.getUint256(0).toString());
      setSnackbar({
        message: "Value retrieved successfully",
        open: true,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        message: "Failed to get value: " + err.toString(),
        open: true,
        severity: "error",
      });
    }
    setBackdropOpen(false);
  };

  const isDeployed = contract.contractId != null;

  return (
    <div>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropOpen}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3000}
        open={snackbar.open}
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
        <Code fontSize="small" />
        <b style={{ marginLeft: "5px" }}>Smart Contract</b>
      </Typography>

      <Grid container spacing={3}>
        {/* Left: Source code */}
        <Grid item xs={12} md={7}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}
          >
            {/* Code block header */}
            <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa", display: "flex", alignItems: "center", gap: 1 }}>
              <Code sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="subtitle2" fontWeight={700}>SimpleStorage.sol</Typography>
              <Box sx={{ flex: 1 }} />
              <Chip label="Solidity 0.8" size="small" sx={{ fontSize: "0.68rem", height: 18 }} />
              <Chip label="Smart Contract" size="small" sx={{ fontSize: "0.68rem", height: 18, backgroundColor: "#f0f2ff", color: "#5D6DD8" }} />
            </Box>

            {/* Source */}
            <Box sx={{ height: 400, minHeight: 120, maxHeight: "80vh", resize: "vertical", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <SyntaxHighlighter
                language="solidity"
                style={vscDarkPlus}
                showLineNumbers
                lineNumberStyle={{ color: "#45475a", minWidth: 36, paddingRight: 12, userSelect: "none", fontSize: "0.75rem" }}
                customStyle={{ margin: 0, padding: "12px 16px", fontSize: "0.8rem", lineHeight: 1.75, flex: 1, overflowY: "auto", overflowX: "auto", height: "100%", background: "#1e1e1e", borderRadius: 0 }}
                codeTagProps={{ style: { fontFamily: "'Fira Code', 'Courier New', monospace" } }}
              >
                {SOLIDITY_SOURCE}
              </SyntaxHighlighter>
            </Box>
          </Card>
        </Grid>

        {/* Right: Deploy + Contract info */}
        <Grid item xs={12} md={5}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Deploy card */}
            <Card
              elevation={0}
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Deploy
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2.5 }}
                >
                  Compile and deploy this contract to Hedera Testnet.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  color="primary"
                  startIcon={
                    deploying ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <CloudUpload />
                    )
                  }
                  onClick={deploy}
                  disabled={deploying}
                  sx={{ py: 1.25, textTransform: "none", fontSize: "0.95rem" }}
                >
                  {deploying ? "Deploying…" : "Deploy to Hedera Testnet"}
                </Button>
              </CardContent>
            </Card>

            {/* Contract info — shown after deploy */}
            {isDeployed && (
              <Card
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "success.main",
                  backgroundColor: "#f6fef6",
                }}
              >
                <CardContent sx={{ pb: "16px !important" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "success.main",
                      }}
                    />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Contract Deployed
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        Contract ID
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", fontWeight: 600 }}
                      >
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={
                            "https://hashscan.io/testnet/contract/" +
                            contract.contractId?.toString()
                          }
                          style={{ color: "#5D6DD8", textDecoration: "none" }}
                        >
                          {contract.contractId?.toString()}
                        </a>
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        EVM Address
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          wordBreak: "break-all",
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        0x{contract.contractAddress}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>

        {/* Interact section — full width */}
        <Grid item xs={12}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider" }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Interact
              </Typography>

              {!isDeployed ? (
                <Typography variant="body2" color="text.secondary">
                  Deploy the contract first to interact with it.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {/* set() */}
                  <Box sx={{ py: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <Chip
                        label="write"
                        size="small"
                        sx={{
                          fontSize: "0.68rem",
                          height: 20,
                          backgroundColor: "#fff3e0",
                          color: "#e65100",
                          fontWeight: 700,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          color: "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        set(uint256 value)
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <TextField
                        label="Value"
                        type="number"
                        variant="outlined"
                        size="small"
                        inputRef={inputRef}
                        sx={{ width: 180 }}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Edit fontSize="small" />}
                        onClick={setData}
                        sx={{ textTransform: "none" }}
                      >
                        Set value
                      </Button>
                    </Box>
                  </Box>

                  <Divider />

                  {/* get() */}
                  <Box sx={{ py: 2.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <Chip
                        label="read"
                        size="small"
                        sx={{
                          fontSize: "0.68rem",
                          height: 20,
                          backgroundColor: "#eef0fb",
                          color: "#5D6DD8",
                          fontWeight: 700,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          color: "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        get() → uint256
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<QueryStats fontSize="small" />}
                        onClick={getData}
                        sx={{
                          textTransform: "none",
                          borderColor: "#5D6DD8",
                          color: "#5D6DD8",
                          "&:hover": {
                            borderColor: "#4a5bc4",
                            backgroundColor: "#eef0fb",
                          },
                        }}
                      >
                        Get value
                      </Button>
                      {queryResult !== null && (
                        <Paper
                          elevation={0}
                          sx={{
                            px: 2,
                            py: 0.75,
                            border: "1px solid",
                            borderColor: "#5D6DD8",
                            borderRadius: 1,
                            backgroundColor: "#eef0fb",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.7rem",
                              color: "#5D6DD8",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              fontWeight: 700,
                            }}
                          >
                            result
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.9rem",
                              fontWeight: 700,
                              color: "#1a1a2e",
                            }}
                          >
                            {queryResult}
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default SmartContract;
