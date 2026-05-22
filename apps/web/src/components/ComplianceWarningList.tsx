import { Alert, Space } from "antd";

type Props = {
  complianceWarnings: string[];
  continuityWarnings: string[];
};

export function ComplianceWarningList({ complianceWarnings, continuityWarnings }: Props) {
  return (
    <Space direction="vertical" className="full-width">
      {complianceWarnings.map((warning) => (
        <Alert key={warning} type="warning" showIcon message={warning} />
      ))}
      {continuityWarnings.map((warning) => (
        <Alert key={warning} type="info" showIcon message={warning} />
      ))}
    </Space>
  );
}
