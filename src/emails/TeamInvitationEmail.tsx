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

interface TeamInvitationEmailProps {
  name: string
  organizationName: string
  inviterName: string
  inviteUrl: string
  role: string
}

export const TeamInvitationEmail = ({
  name,
  organizationName,
  inviterName,
  inviteUrl,
  role,
}: TeamInvitationEmailProps) => {
  const previewText = `Join ${organizationName} on Tightship PMS`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Join {organizationName}</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            {inviterName} has invited you to join <strong>{organizationName}</strong> on Tightship
            PMS as a <strong>{role}</strong>.
          </Text>
          <Text style={text}>
            Tightship PMS helps restaurants sync their menus across delivery platforms like
            Deliveroo and Uber Eats automatically. Your team is using it to save time and reduce
            errors.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={text}>
            This invitation will expire in 7 days. If you have any questions, please contact{' '}
            {inviterName}.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Tightship PMS - Automatic Menu Syncing for Restaurants
            <br />
            If you didn&apos;t expect this invitation, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TeamInvitationEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#0f172a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
  textAlign: 'center' as const,
}

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 48px',
}

const buttonContainer = {
  padding: '27px 48px',
}

const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 48px',
}

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
  textAlign: 'center' as const,
}
