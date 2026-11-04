/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Recupere sua senha do {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Recupere sua senha</Heading>
        <Text style={text}>
          Recebemos um pedido para recuperar sua senha do {siteName}. Clique abaixo para escolher uma nova senha.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Criar nova senha
        </Button>
        <Text style={footer}>
          Se você não solicitou a recuperação, ignore este e-mail. Sua senha não será alterada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(0, 0%, 8%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(0, 0%, 38%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: 'hsl(38, 48%, 58%)',
  color: 'hsl(0, 0%, 8%)',
  fontSize: '14px',
  border: '1px solid hsl(38, 48%, 58%)',
  borderRadius: '6px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: hsl(38, 48%, 58%) !important; color: hsl(0, 0%, 8%) !important; }
  }
  [data-ogsc] .dm-btn { background-color: hsl(38, 48%, 58%) !important; color: hsl(0, 0%, 8%) !important; }
  [data-ogsb] .dm-btn { background-color: hsl(38, 48%, 58%) !important; color: hsl(0, 0%, 8%) !important; }
`
