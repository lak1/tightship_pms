import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  userName: string;
  organizationName?: string;
  dashboardUrl: string;
}

export const WelcomeEmail = ({
  userName = 'there',
  organizationName,
  dashboardUrl = 'https://tightshippms.com/dashboard',
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Welcome to Tightship PMS{organizationName ? ` - ${organizationName}` : ''}!
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoText}>🚢 Tightship PMS</Heading>
        </Section>
        
        <Heading style={h1}>
          Welcome aboard, {userName}!
        </Heading>
        
        <Text style={text}>
          Thank you for joining Tightship PMS, the centralized pricing management platform for restaurants.
          {organizationName && ` We're excited to help ${organizationName} streamline its pricing operations.`}
        </Text>

        <Text style={text}>
          With Tightship PMS, you can now:
        </Text>

        <ul style={list}>
          <li>Manage pricing across all delivery platforms from one place</li>
          <li>Sync menu changes automatically with integrated platforms</li>
          <li>Track performance with detailed analytics</li>
          <li>Set up dynamic pricing rules to maximize revenue</li>
        </ul>

        <Section style={buttonContainer}>
          <Button style={button} href={dashboardUrl}>
            Get Started
          </Button>
        </Section>

        <Text style={text}>
          If you have any questions or need help getting started, don't hesitate to reach out to our support team.
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

const list = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  paddingLeft: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

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

export default WelcomeEmail;