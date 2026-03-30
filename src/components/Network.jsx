import MirrorNodeAPI from "../api/mirror-node-api";
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Storage } from "@mui/icons-material";

const truncate = (str, n) =>
  str && str.length > n ? str.slice(0, n) + "…" : str;

const Network = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const queryNodeAddresses = async () => {
      const api = new MirrorNodeAPI(process.env.REACT_APP_API_URL);
      const response = await api.getNodes();
      const nodes = response.data.nodes;
      const rowsData = nodes.map((node) => {
        const endpoints = node.service_endpoints.map(
          (endpoint) => endpoint.ip_address_v4 + ":" + endpoint.port
        );
        return {
          node_id: node.node_id,
          node_account_id: node.node_account_id,
          public_key: node.public_key,
          endpoints,
          status: "online",
        };
      });
      setRows(rowsData);
    };
    queryNodeAddresses();
  }, []);

  return (
    <div>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <Storage fontSize="small" />
        <Typography variant="h5" fontWeight={700}>
          Network
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{ backgroundColor: "#fafafa" }}
                >
                  {["Node ID", "Account ID", "Public Key", "Endpoints", "Status"].map(
                    (h) => (
                      <TableCell
                        key={h}
                        sx={{ fontWeight: 700, fontSize: "0.78rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        {h}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.node_id}
                    sx={{ "&:last-child td": { border: 0 }, "&:hover": { backgroundColor: "#fafafa" } }}
                  >
                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {row.node_id}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>
                      {row.node_account_id}
                    </TableCell>
                    <TableCell>
                      <Tooltip arrow title={row.public_key} placement="top">
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem", cursor: "help" }}
                        >
                          {truncate(row.public_key, 24)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {row.endpoints.map((ep) => (
                        <Typography
                          key={ep}
                          variant="body2"
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        >
                          {ep}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="online"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 22 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Network;
