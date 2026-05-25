import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  title: { fontSize: 24, marginBottom: 20, fontWeight: "bold" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 10, color: "#666" },
  value: { fontSize: 10 },
  kpi: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
});

type PdfData = {
  period: string;
  totalBalance: number;
  income: number;
  expenses: number;
  currency: string;
  categories: { name: string; amount: number }[];
};

function ReportDocument({ data }: { data: PdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Money Manager Report</Text>
        <Text style={styles.label}>Period: {data.period}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.kpi}>
            Balance: {data.currency} {data.totalBalance.toFixed(2)}
          </Text>
          <View style={styles.row}>
            <Text style={styles.value}>Income: {data.income.toFixed(2)}</Text>
            <Text style={styles.value}>Expenses: {data.expenses.toFixed(2)}</Text>
          </View>
          <Text style={styles.value}>
            Net: {(data.income - data.expenses).toFixed(2)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          {data.categories.map((cat) => (
            <View key={cat.name} style={styles.row}>
              <Text style={styles.value}>{cat.name}</Text>
              <Text style={styles.value}>
                {data.currency} {cat.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function generatePdfExport(data: PdfData): Promise<Buffer> {
  const doc = pdf(<ReportDocument data={data} />);
  const blob = await doc.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
