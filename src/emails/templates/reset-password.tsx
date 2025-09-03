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
} from '@react-email/components';
import * as React from 'react';

interface ResetPasswordProps {
  userName: string;
  resetUrl: string;
}

export const ResetPassword = ({
  userName = 'there',
  resetUrl = 'https://tightshippms.com/auth/reset-password',
}: ResetPasswordProps) => (
  <Html>
    <Head />
    <Preview>Reset your password - Tightship PMS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoText}>🚢 Tightship PMS</Heading>
        </Section>
        
        <Heading style={h1}>
          Reset your password
        </Heading>
        
        <Text style={text}>
          Hi {userName},
        </Text>

        <Text style={text}>
          You requested to reset your password for your Tightship PMS account. 
          Click the button below to set a new password.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={resetUrl}>
            Reset Password
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        
        <Text style={linkText}>
          {resetUrl}
        </Text>

        <Text style={text}>
          This password reset link will expire in <strong>1 hour</strong> for security reasons.
        </Text>

        <Text style={securityText}>
          🔒 <strong>Security Notice:</strong> If you didn't request a password reset, 
          you can safely ignore this email. Your password will remain unchanged.
        </Text>

        <Hr style={hr} />
        
        <Text style={footer}>
          Best regards,<br />
          The Tightship Team
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const logoSection = {
  padding: '0 0 20px',
  textAlign: 'center' as const,
};

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
};

const securityText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  backgroundColor: '#fef3c7',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #fbbf24',
};

const linkText = {
  color: '#3b82f6',
  fontSize: '14px',
  lineHeight: '24px',
  wordBreak: 'break-all' as const,
  padding: '12px',
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  fontFamily: 'monospace',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  fontWeight: 'bold',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '42px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
};

export default ResetPassword;