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

interface SyncCompleteEmailProps {
  restaurantName: string
  platformName: string
  categoriesUploaded: number
  itemsUploaded: number
  syncedAt: string
}

export const SyncCompleteEmail = ({
  restaurantName = 'Your Restaurant',
  platformName = 'Platform',
  categoriesUploaded = 0,
  itemsUploaded = 0,
  syncedAt = new Date().toISOString(),
}: SyncCompleteEmailProps) => {
  const formattedDate = new Date(syncedAt).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return (
    <Html>
      <Head />
      <Preview>
        Menu sync completed successfully for {restaurantName} on {platformName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>🚢 Tightship PMS</Heading>
          </Section>

          <Section style={successBadge}>
            <Text style={successIcon}>✓</Text>
            <Heading style={h1}>Sync Complete!</Heading>
          </Section>

          <Text style={text}>
            Your menu has been successfully synchronized with <strong>{platformName}</strong>.
          </Text>

          <Section style={statsContainer}>
            <table style={statsTable}>
              <tr>
                <td style={statLabel}>Restaurant:</td>
                <td style={statValue}>{restaurantName}</td>
              </tr>
              <tr>
                <td style={statLabel}>Platform:</td>
                <td style={statValue}>{platformName}</td>
              </tr>
              <tr>
                <td style={statLabel}>Categories:</td>
                <td style={statValue}>{categoriesUploaded}</td>
              </tr>
              <tr>
                <td style={statLabel}>Items:</td>
                <td style={statValue}>{itemsUploaded}</td>
              </tr>
              <tr>
                <td style={statLabel}>Synced At:</td>
                <td style={statValue}>{formattedDate}</td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            Your menu is now live on {platformName}. Customers can start ordering your updated menu items.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href="https://tightshippms.com/dashboard">
              View Dashboard
            </Button>
          </Section>

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

const successBadge = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const successIcon = {
  fontSize: '48px',
  color: '#10b981',
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

const statsContainer = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const statsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const statLabel = {
  color: '#6b7280',
  fontSize: '14px',
  paddingBottom: '12px',
  paddingRight: '16px',
  textAlign: 'left' as const,
}

const statValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  paddingBottom: '12px',
  textAlign: 'left' as const,
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

const hr = {
  borderColor: '#e5e7eb',
  margin: '42px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
}

export default SyncCompleteEmail
