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

interface InvoiceEmailProps {
  organizationName: string
  invoiceNumber: string
  amount: number
  invoiceDate: string
  invoiceUrl: string
}

export const InvoiceEmail = ({
  organizationName = 'Your Organization',
  invoiceNumber = 'INV-0000',
  amount = 0,
  invoiceDate = new Date().toISOString(),
  invoiceUrl = 'https://tightshippms.com/billing',
}: InvoiceEmailProps) => {
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount / 100) // Convert from pence to pounds

  const formattedDate = new Date(invoiceDate).toLocaleDateString('en-GB', {
    dateStyle: 'long',
  })

  return (
    <Html>
      <Head />
      <Preview>
        Your Tightship PMS invoice {invoiceNumber} is ready
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>🚢 Tightship PMS</Heading>
          </Section>

          <Heading style={h1}>Invoice {invoiceNumber}</Heading>

          <Text style={text}>Dear {organizationName} team,</Text>

          <Text style={text}>
            Thank you for your continued business. Your invoice for Tightship PMS subscription is now available.
          </Text>

          <Section style={invoiceContainer}>
            <table style={invoiceTable}>
              <tr>
                <td style={invoiceLabel}>Invoice Number:</td>
                <td style={invoiceValue}>{invoiceNumber}</td>
              </tr>
              <tr>
                <td style={invoiceLabel}>Invoice Date:</td>
                <td style={invoiceValue}>{formattedDate}</td>
              </tr>
              <tr>
                <td style={invoiceLabel}>Amount:</td>
                <td style={invoiceValueAmount}>{formattedAmount}</td>
              </tr>
              <tr>
                <td style={invoiceLabel}>Status:</td>
                <td style={invoiceValuePaid}>
                  <span style={paidBadge}>PAID</span>
                </td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            This invoice has been automatically paid using your payment method on file. No further action is required.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={invoiceUrl}>
              View Invoice
            </Button>
          </Section>

          <Text style={text}>
            <strong>What's included:</strong>
          </Text>

          <ul style={list}>
            <li>Unlimited menu syncs across all platforms</li>
            <li>Real-time price and stock management</li>
            <li>Advanced analytics and reporting</li>
            <li>Priority support</li>
          </ul>

          <Text style={helpText}>
            Questions about your invoice? Contact us at{' '}
            <a href="mailto:billing@tightshippms.com" style={link}>
              billing@tightshippms.com
            </a>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Thank you for choosing Tightship PMS!
            <br />
            <br />
            Best regards,
            <br />
            The Tightship Team
          </Text>

          <Section style={legalSection}>
            <Text style={legalText}>
              Tightship PMS Ltd
              <br />
              Company No. 12345678
              <br />
              VAT No. GB123456789
              <br />
              support@tightshippms.com
            </Text>
          </Section>
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

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
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

const invoiceContainer = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  padding: '24px',
  margin: '24px 0',
}

const invoiceTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const invoiceLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  paddingBottom: '12px',
  paddingRight: '16px',
  textAlign: 'left' as const,
}

const invoiceValue = {
  color: '#1f2937',
  fontSize: '16px',
  paddingBottom: '12px',
  textAlign: 'left' as const,
}

const invoiceValueAmount = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  paddingBottom: '12px',
  textAlign: 'left' as const,
}

const invoiceValuePaid = {
  paddingBottom: '12px',
  textAlign: 'left' as const,
}

const paidBadge = {
  backgroundColor: '#d1fae5',
  color: '#065f46',
  padding: '4px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
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

const legalSection = {
  marginTop: '32px',
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
}

const legalText = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  lineHeight: '20px',
  margin: '0',
}

export default InvoiceEmail
