import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
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
  Slider,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Tooltip,
  Typography,
} from "@mui/material";
import { Alarm, CheckCircle, ContentCopy, Code, Download, PlayArrow, RocketLaunch } from "@mui/icons-material";
import {
  ContractCreateTransaction,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  FileCreateTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import solidity from "react-syntax-highlighter/dist/esm/languages/prism/solidity";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
SyntaxHighlighter.registerLanguage("solidity", solidity);

// ─── Pre-compiled ScheduledCounter (solc 0.8.20, paris EVM, HSS precompile 0x16b) ──
const BYTECODE =
  "60806040526103fa806100136000396000f3fe6080604052600436106100435760003560e01c806306661abd1461004f5780632adbf7f8146100785780634179fc05146100b0578063d09de08a146100d257600080fd5b3661004a57005b600080fd5b34801561005b57600080fd5b5061006560005481565b6040519081526020015b60405180910390f35b34801561008457600080fd5b50600154610098906001600160a01b031681565b6040516001600160a01b03909116815260200161006f565b3480156100bc57600080fd5b506100d06100cb36600461029b565b6100e7565b005b3480156100de57600080fd5b506100d061024a565b60006100f382426102ca565b6040805160048082526024820183526020820180516001600160e01b031663684ef04560e11b1790529151630deb7fbd60e31b815292935091600091829161016b91636f5bfde8916101529130918991621e84809188918b91016102e3565b60408051808303816000875af1158015610170573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610194919061035f565b91509150601660070b8260070b146101f25760405162461bcd60e51b815260206004820152601960248201527f4853533a207363686564756c652063616c6c206661696c656400000000000000604482015260640160405180910390fd5b600180546001600160a01b0319166001600160a01b0383169081179091556040518581527f64ecdc7e5f7ac3d1a30b5f70327217afc8af1ee65059d7109d2d483f0071d9129060200160405180910390a25050505050565b600080549080610259836103ab565b91905055507f3cf8b50771c17d723f2cb711ca7dadde485b222e13c84ba0730a14093fad6d5c60005460405161029191815260200190565b60405180910390a1565b6000602082840312156102ad57600080fd5b5035919050565b634e487b7160e01b600052601160045260246000fd5b808201808211156102dd576102dd6102b4565b92915050565b60018060a01b038616815284602082015283604082015267ffffffffffffffff8316606082015260a06080820152600082518060a084015260005b8181101561033b57602081860181015160c086840101520161031e565b50600060c0828501015260c0601f19601f8301168401019150509695505050505050565b6000806040838503121561037257600080fd5b82518060070b811461038357600080fd5b60208401519092506001600160a01b03811681146103a057600080fd5b809150509250929050565b6000600182016103bd576103bd6102b4565b506001019056fea2646970667358221220095ef7a4535d5228821977528088e990431c40c4390adec47dfb3b8a68090e2164736f6c634300081a0033";

const SOLIDITY_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHederaScheduleService {
    // HSS precompile at 0x16b
    function scheduleCall(
        address to,
        uint256 expirySecond,
        uint256 gasLimit,
        uint64 value,       // tinybars to send with the scheduled call (0 = none)
        bytes memory callData
    ) external returns (int64 responseCode, address scheduleAddress);
}

contract ScheduledCounter {
    uint256 public count;
    address public lastScheduleAddress;
    address constant HSS_PRECOMPILE = address(0x16b);

    event CounterIncremented(uint256 newCount);
    event IncrementScheduled(address indexed scheduleAddress, uint256 expiry);

    constructor() payable {} // funded at deploy — contract balance pays execution fees

    /// Called autonomously by the Hedera network when the schedule fires
    function increment() external {
        count++;
        emit CounterIncremented(count);
    }

    /// Schedules a self-call to increment() after delaySeconds.
    /// Execution fees are paid from the contract's own HBAR balance.
    function scheduleIncrement(uint256 delaySeconds) external {
        uint256 expiry = block.timestamp + delaySeconds;
        bytes memory callData = abi.encodeWithSignature("increment()");
        (int64 responseCode, address scheduleAddress) =
            IHederaScheduleService(HSS_PRECOMPILE).scheduleCall(
                address(this), expiry, 2_000_000, 0, callData
            );
        require(responseCode == int64(22), "HSS: schedule call failed");
        lastScheduleAddress = scheduleAddress;
        emit IncrementScheduled(scheduleAddress, expiry);
    }

    receive() external payable {}
}`;

const METADATA = {"compiler":{"version":"0.8.26+commit.8a97fa7a"},"language":"Solidity","output":{"abi":[{"inputs":[],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newCount","type":"uint256"}],"name":"CounterIncremented","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"scheduleAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"expiry","type":"uint256"}],"name":"IncrementScheduled","type":"event"},{"inputs":[],"name":"count","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"increment","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"lastScheduleAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"delaySeconds","type":"uint256"}],"name":"scheduleIncrement","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],"devdoc":{"kind":"dev","methods":{},"version":1},"userdoc":{"kind":"user","methods":{"increment()":{"notice":"Called autonomously by the Hedera network when the schedule fires"},"scheduleIncrement(uint256)":{"notice":"Schedules a self-call to increment() after delaySeconds. Execution fees are paid from the contract's own HBAR balance."}},"version":1}},"settings":{"compilationTarget":{"ScheduledCounter.sol":"ScheduledCounter"},"evmVersion":"paris","libraries":{},"metadata":{"bytecodeHash":"ipfs"},"optimizer":{"enabled":true,"runs":200},"remappings":[]},"sources":{"ScheduledCounter.sol":{"keccak256":"0xe91832e652b57a836a5c42f52405a25027fc5b2935712a5594b9e76d2c833a23","license":"MIT","urls":["bzz-raw://2fa2f08e315c8684c570305aa71ff87e23bb4c031bc3404d353f5ba4b8ce983d","dweb:/ipfs/QmbWKV9WAoJ6fR9ok3CkvGPGv7xd1XzLqWyGkNQ4ShBo8m"]}},"version":1};

const STEPS = ["View Code", "Deploy", "Schedule Call", "Monitor"];
const ACCENT = "#5D6DD8";

// Convert EVM address (0x000...XXXXX) → Hedera entity ID string "0.0.XXXXX"
const evmToEntityId = (evmAddr) => {
  if (!evmAddr) return null;
  const num = parseInt(evmAddr.replace("0x", ""), 16);
  return `0.0.${num}`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CopyChip = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip title={copied ? "Copied!" : "Copy"}>
      <Chip
        label={copied ? "Copied!" : label || value}
        size="small"
        icon={<ContentCopy sx={{ fontSize: "13px !important" }} />}
        onClick={copy}
        sx={{ fontFamily: "monospace", fontSize: "0.72rem", cursor: "pointer", backgroundColor: "#f0f2ff", color: ACCENT }}
      />
    </Tooltip>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ScheduledCounter = (props) => {
  const [activeStep, setActiveStep] = useState(0);
  const [contractId, setContractId] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [count, setCount] = useState(null);
  const [delay, setDelay] = useState(10);
  const [countdown, setCountdown] = useState(null);
  const [scheduleId, setScheduleId] = useState(null);
  const [executed, setExecuted] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const contractIdRef = useRef(null);
  const pollRef = useRef(null);
  const countdownRef = useRef(null);
  const executionTimeRef = useRef(null);
  const prevCountRef = useRef(null);

  const showSnack = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  // ── Read count ──
  const readCount = async (idString) => {
    const idStr = idString ?? contractIdRef.current?.toString();
    if (!idStr) return null;
    try {
      const res = await new ContractCallQuery()
        .setContractId(ContractId.fromString(idStr))
        .setGas(100_000)
        .setFunction("count")
        .execute(props.client);
      return Number(res.getUint256(0));
    } catch {
      return null;
    }
  };

  // ── Step 1: Deploy ──
  const deploy = async () => {
    setBackdropOpen(true);
    try {
      const fileResp = await new FileCreateTransaction()
        .setContents(BYTECODE)
        .setMaxTransactionFee(new Hbar(10))
        .execute(props.client);
      const fileId = (await fileResp.getReceipt(props.client)).fileId;

      const contractResp = await new ContractCreateTransaction()
        .setBytecodeFileId(fileId)
        .setGas(500_000)
        .setInitialBalance(new Hbar(5))
        .setMaxTransactionFee(new Hbar(20))
        .execute(props.client);
      const receipt = await contractResp.getReceipt(props.client);

      contractIdRef.current = receipt.contractId;
      const idString = receipt.contractId.toString();
      setContractId(idString);
      setContractAddress("0x" + receipt.contractId.toSolidityAddress());

      const initial = await readCount(idString);
      setCount(initial ?? 0);
      prevCountRef.current = initial ?? 0;

      setActiveStep(2);
      showSnack("Contract deployed successfully");
    } catch (err) {
      showSnack("Deployment failed: " + JSON.stringify(err), "error");
    }
    setBackdropOpen(false);
  };

  // ── Step 2: Call scheduleIncrement() on the contract ──
  // The contract internally calls the HSS precompile at 0x16b to schedule
  // a future self-call to increment(). No SDK scheduling involved.
  const scheduleCall = async () => {
    if (!contractId) { showSnack("No contract deployed", "error"); return; }
    // Always construct a fresh ContractId from the stored string to avoid stale objects
    const cId = ContractId.fromString(contractId);
    contractIdRef.current = cId;
    console.log("Scheduling with contract ID:", cId.toString());

    setBackdropOpen(true);
    setExecuted(false);
    setScheduleId(null);

    try {
      const executionAt = Date.now() + delay * 1000;
      executionTimeRef.current = executionAt;

      const response = await new ContractExecuteTransaction()
        .setContractId(cId)
        .setMaxTransactionFee(new Hbar(20))
        .setGas(3_000_000)
        .setFunction("scheduleIncrement", new ContractFunctionParameters().addUint256(delay))
        .execute(props.client);

      await response.getReceipt(props.client);

      // Read back the schedule address stored by the contract
      const addrRes = await new ContractCallQuery()
        .setContractId(cId)
        .setGas(100_000)
        .setFunction("lastScheduleAddress")
        .execute(props.client);
      const sid = "0x" + addrRes.getAddress(0);
      setScheduleId(sid);

      // Countdown
      setCountdown(delay);
      countdownRef.current = setInterval(() => {
        const remaining = Math.ceil((executionTimeRef.current - Date.now()) / 1000);
        setCountdown(remaining > 0 ? remaining : 0);
        if (remaining <= 0) { clearInterval(countdownRef.current); countdownRef.current = null; }
      }, 500);

      // Poll count every 2s
      const idForPoll = contractId;
      prevCountRef.current = count;
      pollRef.current = setInterval(async () => {
        const val = await readCount(idForPoll);
        if (val !== null) {
          setCount(val);
          if (val > prevCountRef.current) {
            setExecuted(true);
            clearInterval(pollRef.current); pollRef.current = null;
          }
        }
      }, 5000);

      setActiveStep(3);
      showSnack(`Scheduled — increment() fires in ~${delay}s`);
    } catch (err) {
      showSnack("Schedule failed: " + JSON.stringify(err), "error");
    }
    setBackdropOpen(false);
  };

  const scheduleAgain = async () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setExecuted(false);
    setCountdown(null);
    await scheduleCall();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <Backdrop sx={{ color: "#fff", zIndex: (t) => t.zIndex.drawer + 1 }} open={backdropOpen}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={4000}
        open={snackbar.open}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Alarm fontSize="small" />
        <Typography variant="h5" fontWeight={700}>Scheduled Smart Contract Call</Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3, "& .MuiStepLabel-label": { fontSize: "0.8rem" } }}>
        {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── Step 0: Code ── */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", opacity: activeStep > 0 ? 0.7 : 1, transition: "opacity 0.2s" }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa", display: "flex", alignItems: "center", gap: 1 }}>
            <Code sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="subtitle2" fontWeight={700}>Counter.sol</Typography>
            <Box sx={{ flex: 1 }} />
            <Chip label="Solidity 0.8.20" size="small" sx={{ fontSize: "0.68rem", height: 18 }} />
            <Chip label="HSS Precompile 0x16b" size="small" sx={{ fontSize: "0.68rem", height: 18, backgroundColor: "#f0f2ff", color: ACCENT }} />
            <Tooltip title="Download ScheduledCounter.sol + ScheduledCounter.json for HashScan verification">
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download sx={{ fontSize: "14px !important" }} />}
                onClick={async () => {
                  const zip = new JSZip();
                  zip.file("ScheduledCounter.sol", SOLIDITY_SOURCE);
                  zip.file("ScheduledCounter.json", JSON.stringify(METADATA, null, 2));
                  const blob = await zip.generateAsync({ type: "blob" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "ScheduledCounter_verification.zip"; a.click();
                  URL.revokeObjectURL(url);
                }}
                sx={{ textTransform: "none", fontSize: "0.72rem", height: 24, px: 1 }}
              >
                Download
              </Button>
            </Tooltip>
          </Box>

          {/* Contract source */}
          <Box sx={{ height: 280, minHeight: 120, maxHeight: "80vh", resize: "vertical", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <SyntaxHighlighter
              language="solidity"
              style={vscDarkPlus}
              showLineNumbers
              lineNumberStyle={{ color: "#45475a", minWidth: 36, paddingRight: 12, userSelect: "none", fontSize: "0.75rem" }}
              customStyle={{ margin: 0, padding: "12px 16px", fontSize: "0.78rem", lineHeight: 1.7, flex: 1, overflowY: "auto", overflowX: "auto", height: "100%", background: "#1e1e1e", borderRadius: 0 }}
              codeTagProps={{ style: { fontFamily: "monospace" } }}
            >
              {SOLIDITY_SOURCE}
            </SyntaxHighlighter>
          </Box>

          {/* How it works */}
          <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider", backgroundColor: "#fafafa" }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.8, display: "block", mb: 1.5 }}>
              <strong>How it works:</strong> When <code style={{ fontFamily: "monospace" }}>scheduleIncrement(delay)</code> is called, the contract calls the
              <code style={{ fontFamily: "monospace", background: "#f0f2ff", padding: "1px 4px", borderRadius: 3 }}> IHederaScheduleService</code> precompile at <code style={{ fontFamily: "monospace", background: "#f0f2ff", padding: "1px 4px", borderRadius: 3 }}>0x16b</code>,
              registering a future self-call to <code style={{ fontFamily: "monospace" }}>increment()</code> with an on-chain expiry. The contract's own HBAR balance (funded at deploy) covers the execution fees.
              Hedera executes <code style={{ fontFamily: "monospace" }}>increment()</code> automatically at expiry — no keeper, no external script.
            </Typography>
            {activeStep === 0 && (
              <Button variant="contained" color="primary" onClick={() => setActiveStep(1)} sx={{ textTransform: "none" }}>
                Continue to Deploy →
              </Button>
            )}
          </Box>
        </Card>

        {/* ── Step 1: Deploy ── */}
        {activeStep >= 1 && (
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa", display: "flex", alignItems: "center", gap: 1 }}>
              <RocketLaunch sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="subtitle2" fontWeight={700}>Deploy Contract</Typography>
              {contractId && <Chip label="Deployed" color="success" size="small" sx={{ fontSize: "0.7rem", height: 20 }} />}
            </Box>
            <CardContent>
              {!contractId ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Deploys the <strong>Counter</strong> contract to Hedera testnet via <code style={{ fontFamily: "monospace" }}>FileCreateTransaction</code> + <code style={{ fontFamily: "monospace" }}>ContractCreateTransaction</code>.
                  </Typography>
                  <Button variant="contained" startIcon={<RocketLaunch />} onClick={deploy} sx={{ textTransform: "none" }}>
                    Deploy to Testnet
                  </Button>
                </>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Contract ID</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        <a href={`https://hashscan.io/testnet/contract/${contractId}`} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>{contractId}</a>
                      </Typography>
                      <CopyChip value={contractId} label="copy" />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>EVM Address</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.78rem" }}>{contractAddress}</Typography>
                      <CopyChip value={contractAddress} label="copy" />
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Steps 2 & 3: Schedule + Monitor ── */}
        {activeStep >= 2 && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>

            {/* Schedule */}
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa", display: "flex", alignItems: "center", gap: 1 }}>
                <Alarm sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="subtitle2" fontWeight={700}>Schedule increment()</Typography>
              </Box>
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Calls <code style={{ fontFamily: "monospace", background: "#f0f2ff", padding: "1px 4px", borderRadius: 3 }}>scheduleIncrement({delay})</code> on the contract.
                  The contract calls the HSS precompile at <code style={{ fontFamily: "monospace" }}>0x16b</code> to register a future self-call to <code style={{ fontFamily: "monospace" }}>increment()</code>
                  with expiry <strong>now + {delay}s</strong>. Execution fees are paid from the contract's own HBAR balance.
                </Typography>

                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 1 }}>
                  Execution delay: <strong>{delay} seconds</strong>
                </Typography>
                <Slider
                  value={delay}
                  onChange={(_, v) => setDelay(v)}
                  min={10}
                  max={60}
                  step={5}
                  marks={[{ value: 10, label: "10s" }, { value: 30, label: "30s" }, { value: 60, label: "60s" }]}
                  disabled={activeStep === 3 && !executed}
                  sx={{ mb: 2.5, color: ACCENT }}
                />

                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={activeStep === 2 ? scheduleCall : scheduleAgain}
                  disabled={activeStep === 3 && !executed}
                  fullWidth
                  sx={{ textTransform: "none" }}
                >
                  {activeStep === 2 ? `Schedule in ${delay}s` : "Schedule Again"}
                </Button>

                {scheduleId && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Schedule ID</Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                      <a href={`https://hashscan.io/testnet/schedule/${evmToEntityId(scheduleId)}`} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>{evmToEntityId(scheduleId)}</a>
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Monitor */}
            <Card elevation={0} sx={{ border: "1px solid", borderColor: executed ? "#c6f6d5" : "divider", transition: "border-color 0.4s" }}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", backgroundColor: "#fafafa", display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Monitor</Typography>
                {activeStep === 3 && !executed && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: "auto" }}>
                    <CircularProgress size={12} thickness={5} />
                    <Typography variant="caption" color="text.secondary">polling every 2s</Typography>
                  </Box>
                )}
                {executed && <Chip label="Executed!" color="success" size="small" sx={{ fontSize: "0.7rem", height: 20, ml: "auto" }} />}
              </Box>
              <CardContent>
                {/* Counter display */}
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 1 }}>count</Typography>
                  <Typography
                    variant="h1"
                    fontWeight={800}
                    sx={{ fontSize: "5rem", color: executed ? "#2e7d32" : ACCENT, transition: "color 0.4s", fontFamily: "monospace" }}
                  >
                    {count ?? "—"}
                  </Typography>
                  <Button
                    size="small" variant="text"
                    onClick={async () => { const v = await readCount(); if (v !== null) setCount(v); }}
                    sx={{ textTransform: "none", mt: 0.5, fontSize: "0.75rem", color: "text.secondary" }}
                  >
                    Refresh
                  </Button>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Countdown */}
                {activeStep === 3 && countdown !== null && !executed && (
                  <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1, backgroundColor: "#fffbf0", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Hedera executes in</Typography>
                    <Chip label={countdown > 0 ? `${countdown}s` : "now…"} size="small"
                      sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.82rem", height: 24, backgroundColor: "#fef3c7", color: "#92400e" }}
                    />
                  </Box>
                )}

                {executed && (
                  <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: "#f0fff4", border: "1px solid #c6f6d5" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                      <CheckCircle sx={{ fontSize: 18, color: "#2e7d32" }} />
                      <Typography variant="body2" fontWeight={700} color="#2e7d32">increment() fired autonomously!</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.7 }}>
                      Hedera called <code style={{ fontFamily: "monospace" }}>increment()</code> on the contract automatically at the scheduled time — no wallet interaction, no keeper script.
                    </Typography>
                    {contractId && (
                      <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                        <a href={`https://hashscan.io/testnet/schedule/${evmToEntityId(scheduleId)}`} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>
                          View schedule on HashScan →
                        </a>
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </div>
  );
};

export default ScheduledCounter;
