import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface SyncFailedEmailProps {
  restaurantName: string
  platformName: string
  errorMessage: string
  failedAt: string
}

export const SyncFailedEmail = ({
  restaurantName = 'Your Restaurant',
  platformName = 'Platform',
  errorMessage = 'Unknown error occurred',
  failedAt = new Date().toISOString(),
}: SyncFailedEmailProps) => {
  const formattedDate = new Date(failedAt).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return (
    <Html>
      <Head />
      <Preview>
        Menu sync failed for {restaurantName} on {platformName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>🚢 Tightship PMS</Heading>
          </Section>

          <Section style={errorBadge}>
            <Text style={errorIcon}>✕</Text>
            <Heading style={h1}>Sync Failed</Heading>
          </Section>

          <Text style={text}>
            We encountered an issue while syncing your menu with <strong>{platformName}</strong>.
          </Text>

          <Section style={errorContainer}>
            <table style={errorTable}>
              <tr>
                <td style={errorLabel}>Restaurant:</td>
                <td style={errorValue}>{restaurantName}</td>
              </tr>
              <tr>
                <td style={errorLabel}>Platform:</td>
                <td style={errorValue}>{platformName}</td>
              </tr>
              <tr>
                <td style={errorLabel}>Failed At:</td>
                <td style={errorValue}>{formattedDate}</td>
              </tr>
              <tr>
                <td style={errorLabel} colSpan={2}>
                  Error:
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <div style={errorMessageBox}>{errorMessage}</div>
                </td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            <strong>What to do next:</strong>
          </Text>

          <ul style={list}>
            <li>Check that your integration credentials are valid</li>
            <li>Verify your menu meets {platformName}'s requirements</li>
            <li>Try syncing again from the dashboard</li>
            <li>Contact support if the issue persists</li>
          </ul>

          <Section style={buttonContainer}>
            <Button style={button} href="https://tightshippms.com/dashboard">
              Go to Dashboard
            </Button>
          </Section>

          <Text style={helpText}>
            Need help? Our support team is here to assist you.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Best regards,
            <br />
            The Tightship Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
}

const logoSection = {
  padding: '0 0 20px',
  textAlign: 'center' as const,
}

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
}

const errorBadge = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const errorIcon = {
  fontSize: '48px',
  color: '#ef4444',
  margin: '0',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '10px 0 30px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const list = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  paddingLeft: '20px',
  margin: '16px 0',
}

const errorContainer = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '1px solid #fecaca',
  padding: '24px',
  margin: '24px 0',
}

const errorTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const errorLabel = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '600',
  paddingBottom: '12px',
  paddingRight: '16px',
  textAlign: 'left' as const,
}

const errorValue = {
  color: '#7f1d1d',
  fontSize: '16px',
  paddingBottom: '12px',
  textAlign: 'left' as const,
}

const errorMessageBox = {
  backgroundColor: '#fee2e2',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  padding: '16px',
  color: '#7f1d1d',
  fontSize: '14px',
  fontFamily: 'monospace',
  marginTop: '8px',
  wordBreak: 'break-word' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  fontWeight: 'bold',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '42px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
}

export default SyncFailedEmail
