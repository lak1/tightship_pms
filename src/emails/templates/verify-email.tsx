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

interface VerifyEmailProps {
  userName: string;
  verificationUrl: string;
}

export const VerifyEmail = ({
  userName = 'there',
  verificationUrl = 'https://tightshippms.com/auth/verify',
}: VerifyEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address - Tightship PMS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoText}>🚢 Tightship PMS</Heading>
        </Section>
        
        <Heading style={h1}>
          Verify your email address
        </Heading>
        
        <Text style={text}>
          Hi {userName},
        </Text>

        <Text style={text}>
          Thank you for signing up for Tightship PMS! To complete your account setup, 
          please verify your email address by clicking the button below.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify Email Address
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        
        <Text style={linkText}>
          {verificationUrl}
        </Text>

        <Text style={text}>
          This verification link will expire in <strong>24 hours</strong> for security reasons.
        </Text>

        <Text style={text}>
          If you didn't create an account with Tightship PMS, you can safely ignore this email.
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
  backgroundColor: '#10b981',
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

export default VerifyEmail;