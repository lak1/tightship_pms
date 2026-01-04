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

interface DunningEmailProps {
  organizationName: string
  amountDue: number
  dueDate: string
  invoiceUrl: string
  updatePaymentUrl: string
  attemptNumber: number
}

export const DunningEmail = ({
  organizationName = 'Your Organization',
  amountDue = 0,
  dueDate = new Date().toISOString(),
  invoiceUrl = 'https://tightshippms.com/billing',
  updatePaymentUrl = 'https://tightshippms.com/billing/payment-method',
  attemptNumber = 1,
}: DunningEmailProps) => {
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amountDue / 100) // Convert from pence to pounds

  const formattedDate = new Date(dueDate).toLocaleDateString('en-GB', {
    dateStyle: 'long',
  })

  const urgencyLevel = attemptNumber >= 3 ? 'critical' : attemptNumber >= 2 ? 'high' : 'normal'

  return (
    <Html>
      <Head />
      <Preview>
        Action Required: Update your payment method for {organizationName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>🚢 Tightship PMS</Heading>
          </Section>

          <Section style={warningBadge}>
            <Text style={warningIcon}>⚠</Text>
            <Heading style={h1}>Payment Required</Heading>
          </Section>

          {urgencyLevel === 'critical' && (
            <Section style={criticalAlert}>
              <Text style={criticalText}>
                <strong>URGENT:</strong> This is our final attempt to collect payment. Your account will be suspended
                if payment is not received.
              </Text>
            </Section>
          )}

          <Text style={text}>Dear {organizationName} team,</Text>

          <Text style={text}>
            We were unable to process your recent payment for Tightship PMS.{' '}
            {urgencyLevel === 'critical'
              ? 'Immediate action is required to avoid service interruption.'
              : 'Please update your payment method to continue using our services.'}
          </Text>

          <Section style={paymentContainer}>
            <table style={paymentTable}>
              <tr>
                <td style={paymentLabel}>Amount Due:</td>
                <td style={paymentValue}>{formattedAmount}</td>
              </tr>
              <tr>
                <td style={paymentLabel}>Due Date:</td>
                <td style={paymentValue}>{formattedDate}</td>
              </tr>
              <tr>
                <td style={paymentLabel}>Payment Attempt:</td>
                <td style={paymentValue}>#{attemptNumber}</td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            <strong>Why might this have happened?</strong>
          </Text>

          <ul style={list}>
            <li>Insufficient funds in your account</li>
            <li>Expired or invalid payment card</li>
            <li>Your bank declined the transaction</li>
            <li>Card security settings blocking the payment</li>
          </ul>

          <Section style={buttonContainer}>
            <Button style={primaryButton} href={updatePaymentUrl}>
              Update Payment Method
            </Button>
          </Section>

          <Section style={secondaryButtonContainer}>
            <Button style={secondaryButton} href={invoiceUrl}>
              View Invoice
            </Button>
          </Section>

          {urgencyLevel === 'critical' && (
            <Section style={suspensionWarning}>
              <Text style={suspensionText}>
                <strong>Account Suspension Notice:</strong>
                <br />
                If we don't receive payment within 48 hours, your account will be temporarily suspended. This means:
                <ul style={list}>
                  <li>Menu syncs will stop</li>
                  <li>Platform integrations will be disconnected</li>
                  <li>You won't be able to access the dashboard</li>
                </ul>
              </Text>
            </Section>
          )}

          <Text style={helpText}>
            Need help? Contact our billing team at{' '}
            <a href="mailto:billing@tightshippms.com" style={link}>
              billing@tightshippms.com
            </a>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Thank you for your prompt attention to this matter.
            <br />
            <br />
            Best regards,
            <br />
            The Tightship Billing Team
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

const warningBadge = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const warningIcon = {
  fontSize: '48px',
  color: '#f59e0b',
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

const criticalAlert = {
  backgroundColor: '#fef2f2',
  border: '2px solid #ef4444',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const criticalText = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0',
}

const paymentContainer = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  border: '1px solid #fbbf24',
  padding: '24px',
  margin: '24px 0',
}

const paymentTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const paymentLabel = {
  color: '#78350f',
  fontSize: '14px',
  fontWeight: '600',
  paddingBottom: '12px',
  paddingRight: '16px',
  textAlign: 'left' as const,
}

const paymentValue = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: 'bold',
  paddingBottom: '12px',
  textAlign: 'left' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0 16px',
}

const primaryButton = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 28px',
  fontWeight: 'bold',
}

const secondaryButtonContainer = {
  textAlign: 'center' as const,
  margin: '16px 0 32px',
}

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  color: '#3b82f6',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  fontWeight: 'bold',
}

const suspensionWarning = {
  backgroundColor: '#fee2e2',
  border: '2px solid #dc2626',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const suspensionText = {
  color: '#7f1d1d',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
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

export default DunningEmail
