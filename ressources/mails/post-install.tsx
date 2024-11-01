import { Tables } from "@/types/supabase";
import postmark from "postmark";

export function mailPostInstall(
  user: Tables<"users">,
  dupCount: number
): postmark.Message {
  return {
    From: "welcome@splinar.com",
    To: user.email || "",
    Subject: "Let the cleaning begin",
    TextBody: textContent(dupCount),
    HtmlBody: htmlContent(dupCount),
  };
}

const textContent = (dupCount: number) => `
Splinar

Your account screening is done!

You currently have ${dupCount} identified duplicates in need of deletion in your CRM. Follow this link to access your account and start merging duplicates:
https://app.splinar.com/

Questions? Unsatisfactory results?
Reach out to us at support@splinar.com

© 2024 Splinar
Paris, France
splinar.com
`;

const htmlContent = (dupCount: number) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="https://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <!--<![endif]-->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="format-detection" content="date=no" />
    <meta name="format-detection" content="address=no" />
    <meta name="format-detection" content="email=no" />
    <meta name="x-apple-disable-message-reformatting" />
    <link
      href="https://fonts.googleapis.com/css?family=Fira+Sans:ital,wght@0,100;1,100;0,200;1,200;0,300;1,300;0,400;1,400;0,500;1,500;0,600;1,600;0,700;1,700;0,800;1,800;0,900;1,900"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css?family=Inter:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900"
      rel="stylesheet"
    />
    <title>Let the cleaning begin</title>
    <style>
      @media all {
        /* cyrillic-ext */
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 800;
          font-display: swap;
          src: local("Fira Sans ExtraBold"), local("FiraSans-ExtraBold"),
            url(https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnMK7eSxf6Xl7Gl3LX.woff2)
              format("woff2");
          unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF,
            U+A640-A69F, U+FE2E-FE2F;
        }
        /* cyrillic */
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 800;
          font-display: swap;
          src: local("Fira Sans ExtraBold"), local("FiraSans-ExtraBold"),
            url(https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnMK7eQhf6Xl7Gl3LX.woff2)
              format("woff2");
          unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
        }
        /* latin-ext */
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 800;
          font-display: swap;
          src: local("Fira Sans ExtraBold"), local("FiraSans-ExtraBold"),
            url(https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnMK7eSBf6Xl7Gl3LX.woff2)
              format("woff2");
          unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB,
            U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
        }
        /* latin */
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 800;
          font-display: swap;
          src: local("Fira Sans ExtraBold"), local("FiraSans-ExtraBold"),
            url(https://fonts.gstatic.com/s/firasans/v10/va9B4kDNxMZdWfMOD5VnMK7eRhf6Xl7Glw.woff2)
              format("woff2");
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
            U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
            U+2212, U+2215, U+FEFF, U+FFFD;
        }
      }
    </style>
    <!--<![endif]-->
    <style>
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        min-height: 100% !important;
        width: 100% !important;
        -webkit-font-smoothing: antialiased;
      }

      * {
        -ms-text-size-adjust: 100%;
      }

      #outlook a {
        padding: 0;
      }

      .ReadMsgBody,
      .ExternalClass {
        width: 100%;
      }

      .ExternalClass,
      .ExternalClass p,
      .ExternalClass td,
      .ExternalClass div,
      .ExternalClass span,
      .ExternalClass font {
        line-height: 100%;
      }

      div[style*="margin: 14px 0"],
      div[style*="margin: 16px 0"] {
        margin: 0 !important;
      }

      table,
      td,
      th {
        mso-table-lspace: 0 !important;
        mso-table-rspace: 0 !important;
        border-collapse: collapse;
      }

      body,
      td,
      th,
      p,
      div,
      li,
      a,
      span {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        mso-line-height-rule: exactly;
      }

      img {
        border: 0;
        outline: none;
        line-height: 100%;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
      }

      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
      }

      .pc-gmail-fix {
        display: none;
        display: none !important;
      }

      @media (min-width: 621px) {
        .pc-lg-hide {
          display: none;
        }

        .pc-lg-bg-img-hide {
          background-image: none !important;
        }
      }
    </style>
    <style>
      @media (max-width: 620px) {
        .pc-project-body {
          min-width: 0px !important;
        }
        .pc-project-container {
          width: 100% !important;
        }
        .pc-sm-hide {
          display: none !important;
        }
        .pc-sm-bg-img-hide {
          background-image: none !important;
        }
        table.pc-w620-spacing-0-0-40-0 {
          margin: 0px 0px 40px 0px !important;
        }
        td.pc-w620-spacing-0-0-40-0,
        th.pc-w620-spacing-0-0-40-0 {
          margin: 0 !important;
          padding: 0px 0px 40px 0px !important;
        }
        .pc-w620-fontSize-30 {
          font-size: 30px !important;
        }
        .pc-w620-lineHeight-40 {
          line-height: 40px !important;
        }
        .pc-w620-fontSize-16 {
          font-size: 16px !important;
        }
        .pc-w620-lineHeight-26 {
          line-height: 26px !important;
        }
        .pc-w620-padding-35-35-55-35 {
          padding: 35px 35px 55px 35px !important;
        }

        .pc-w620-gridCollapsed-1 > tbody,
        .pc-w620-gridCollapsed-1 > tbody > tr,
        .pc-w620-gridCollapsed-1 > tr {
          display: inline-block !important;
        }
        .pc-w620-gridCollapsed-1.pc-width-fill > tbody,
        .pc-w620-gridCollapsed-1.pc-width-fill > tbody > tr,
        .pc-w620-gridCollapsed-1.pc-width-fill > tr {
          width: 100% !important;
        }
        .pc-w620-gridCollapsed-1.pc-w620-width-fill > tbody,
        .pc-w620-gridCollapsed-1.pc-w620-width-fill > tbody > tr,
        .pc-w620-gridCollapsed-1.pc-w620-width-fill > tr {
          width: 100% !important;
        }
        .pc-w620-gridCollapsed-1 > tbody > tr > td,
        .pc-w620-gridCollapsed-1 > tr > td {
          display: block !important;
          width: auto !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .pc-w620-gridCollapsed-1.pc-width-fill > tbody > tr > td,
        .pc-w620-gridCollapsed-1.pc-width-fill > tr > td {
          width: 100% !important;
        }
        .pc-w620-gridCollapsed-1.pc-w620-width-fill > tbody > tr > td,
        .pc-w620-gridCollapsed-1.pc-w620-width-fill > tr > td {
          width: 100% !important;
        }
        .pc-w620-gridCollapsed-1
          > tbody
          > .pc-grid-tr-first
          > .pc-grid-td-first,
        pc-w620-gridCollapsed-1 > .pc-grid-tr-first > .pc-grid-td-first {
          padding-top: 0 !important;
        }
        .pc-w620-gridCollapsed-1 > tbody > .pc-grid-tr-last > .pc-grid-td-last,
        pc-w620-gridCollapsed-1 > .pc-grid-tr-last > .pc-grid-td-last {
          padding-bottom: 0 !important;
        }

        .pc-w620-gridCollapsed-0 > tbody > .pc-grid-tr-first > td,
        .pc-w620-gridCollapsed-0 > .pc-grid-tr-first > td {
          padding-top: 0 !important;
        }
        .pc-w620-gridCollapsed-0 > tbody > .pc-grid-tr-last > td,
        .pc-w620-gridCollapsed-0 > .pc-grid-tr-last > td {
          padding-bottom: 0 !important;
        }
        .pc-w620-gridCollapsed-0 > tbody > tr > .pc-grid-td-first,
        .pc-w620-gridCollapsed-0 > tr > .pc-grid-td-first {
          padding-left: 0 !important;
        }
        .pc-w620-gridCollapsed-0 > tbody > tr > .pc-grid-td-last,
        .pc-w620-gridCollapsed-0 > tr > .pc-grid-td-last {
          padding-right: 0 !important;
        }

        .pc-w620-tableCollapsed-1 > tbody,
        .pc-w620-tableCollapsed-1 > tbody > tr,
        .pc-w620-tableCollapsed-1 > tr {
          display: block !important;
        }
        .pc-w620-tableCollapsed-1.pc-width-fill > tbody,
        .pc-w620-tableCollapsed-1.pc-width-fill > tbody > tr,
        .pc-w620-tableCollapsed-1.pc-width-fill > tr {
          width: 100% !important;
        }
        .pc-w620-tableCollapsed-1.pc-w620-width-fill > tbody,
        .pc-w620-tableCollapsed-1.pc-w620-width-fill > tbody > tr,
        .pc-w620-tableCollapsed-1.pc-w620-width-fill > tr {
          width: 100% !important;
        }
        .pc-w620-tableCollapsed-1 > tbody > tr > td,
        .pc-w620-tableCollapsed-1 > tr > td {
          display: block !important;
          width: auto !important;
        }
        .pc-w620-tableCollapsed-1.pc-width-fill > tbody > tr > td,
        .pc-w620-tableCollapsed-1.pc-width-fill > tr > td {
          width: 100% !important;
        }
        .pc-w620-tableCollapsed-1.pc-w620-width-fill > tbody > tr > td,
        .pc-w620-tableCollapsed-1.pc-w620-width-fill > tr > td {
          width: 100% !important;
        }
      }
      @media (max-width: 520px) {
        .pc-w520-padding-30-30-50-30 {
          padding: 30px 30px 50px 30px !important;
        }
      }
    </style>
    <!--[if !mso]><!-->
    <style>
      @media all {
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 100;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9C4kDNxMZdWfMOD5Vn9LjHYTQ.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9C4kDNxMZdWfMOD5Vn9LjHYTI.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 100;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9A4kDNxMZdWfMOD5VvkrCqUT7fdw.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9A4kDNxMZdWfMOD5VvkrCqUT7fcQ.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 200;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnWKneSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnWKneSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 200;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrAGQCf2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrAGQCf2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 300;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnPKreSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnPKreSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 300;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrBiQyf2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrBiQyf2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 400;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9E4kDNxMZdWfMOD5VvmYjN.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9E4kDNxMZdWfMOD5VvmYjL.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 400;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9C4kDNxMZdWfMOD5VvkrjHYTQ.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9C4kDNxMZdWfMOD5VvkrjHYTI.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 500;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnZKveSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnZKveSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 500;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrA6Qif2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrA6Qif2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 600;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnSKzeSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnSKzeSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 600;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrAWRSf2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrAWRSf2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 700;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnLK3eSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnLK3eSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 800;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnMK7eSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnMK7eSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 800;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrBuRyf2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrBuRyf2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 700;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrByRCf2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrByRCf2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: normal;
          font-weight: 900;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnFK_eSBf8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9B4kDNxMZdWfMOD5VnFK_eSBf6.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Fira Sans";
          font-style: italic;
          font-weight: 900;
          src: url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrBKRif2VF8.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/firasans/v17/va9f4kDNxMZdWfMOD5VvkrBKRif2VFk.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 200;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyfAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 400;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 100;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 500;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 300;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKfAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKfAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 800;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 900;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuBWYAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 700;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZFhiA.woff2")
              format("woff2");
        }
        @font-face {
          font-family: "Inter";
          font-style: normal;
          font-weight: 600;
          src: url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZFhjg.woff")
              format("woff"),
            url("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZFhiA.woff2")
              format("woff2");
        }
      }
    </style>
    <!--<![endif]-->
    <!--[if mso]>
      <style type="text/css">
        .pc-font-alt {
          font-family: Arial, Helvetica, sans-serif !important;
        }
      </style>
    <![endif]-->
    <!--[if gte mso 9]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG />
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
  </head>

  <body
    class="pc-font-alt"
    style="
      width: 100% !important;
      min-height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1.5;
      color: #2d3a41;
      mso-line-height-rule: exactly;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-variant-ligatures: normal;
      text-rendering: optimizeLegibility;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f4f4f4;
    "
    bgcolor="#f4f4f4"
  >
    <table
      class="pc-project-body"
      style="table-layout: fixed; min-width: 600px; background-color: #f4f4f4"
      bgcolor="#f4f4f4"
      width="100%"
      border="0"
      cellspacing="0"
      cellpadding="0"
      role="presentation"
    >
      <tr>
        <td align="center" valign="top">
          <table
            class="pc-project-container"
            style="width: 600px; max-width: 600px"
            width="600"
            align="center"
            border="0"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
          >
            <tr>
              <td style="padding: 20px 0px 20px 0px" align="left" valign="top">
                <table
                  border="0"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  width="100%"
                  style="width: 100%"
                >
                  <tr>
                    <td valign="top">
                      <!-- BEGIN MODULE: Header 4 -->
                      <table
                        width="100%"
                        border="0"
                        cellspacing="0"
                        cellpadding="0"
                        role="presentation"
                      >
                        <tr>
                          <td style="padding: 0px 0px 0px 0px">
                            <table
                              width="100%"
                              border="0"
                              cellspacing="0"
                              cellpadding="0"
                              role="presentation"
                            >
                              <tr>
                                <td
                                  valign="top"
                                  class="pc-w520-padding-30-30-50-30 pc-w620-padding-35-35-55-35"
                                  style="
                                    padding: 40px 40px 60px 40px;
                                    border-radius: 0px;
                                    background-color: #ffffff;
                                  "
                                  bgcolor="#ffffff"
                                >
                                  <table
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        class="pc-w620-spacing-0-0-40-0"
                                        align="center"
                                        valign="top"
                                        style="padding: 0px 0px 60px 0px"
                                      >
                                        <img
                                          src="https://uploads-ssl.webflow.com/65218f26d58d152a126b0a07/65ee1169d9a1a95a5f7bbe7e_Logo%20Noir.png"
                                          class=""
                                          width="125"
                                          height="34"
                                          alt=""
                                          style="
                                            display: block;
                                            border: 0;
                                            outline: 0;
                                            line-height: 100%;
                                            -ms-interpolation-mode: bicubic;
                                            width: 125px;
                                            height: auto;
                                            max-width: 100%;
                                          "
                                        />
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        align="center"
                                        valign="top"
                                        style="padding: 0px 0px 33px 0px"
                                      >
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          role="presentation"
                                          align="center"
                                          style="
                                            margin-right: auto;
                                            margin-left: auto;
                                          "
                                        >
                                          <tr>
                                            <td
                                              valign="top"
                                              class="pc-font-alt pc-w620-fontSize-30 pc-w620-lineHeight-40"
                                              align="center"
                                              style="
                                                mso-line-height: exactly;
                                                line-height: 128%;
                                                letter-spacing: -0.6px;
                                                font-family: Fira Sans, Arial,
                                                  Helvetica, sans-serif;
                                                font-size: 36px;
                                                font-weight: 800;
                                                color: #1b1b1b;
                                                text-align: center;
                                                text-align-last: center;
                                                font-variant-ligatures: normal;
                                              "
                                            >
                                              <div>
                                                <span
                                                  >Your account screening is
                                                  done!</span
                                                >
                                              </div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        align="center"
                                        valign="top"
                                        style="padding: 0px 0px 24px 0px"
                                      >
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          role="presentation"
                                          align="center"
                                          style="
                                            margin-right: auto;
                                            margin-left: auto;
                                          "
                                        >
                                          <tr>
                                            <td
                                              valign="top"
                                              class="pc-font-alt pc-w620-fontSize-16 pc-w620-lineHeight-26"
                                              align="center"
                                              style="
                                                mso-line-height: exactly;
                                                line-height: 156%;
                                                letter-spacing: -0.2px;
                                                font-family: Inter, Arial,
                                                  Helvetica, sans-serif;
                                                font-size: 18px;
                                                font-weight: 300;
                                                color: #9b9b9b;
                                                text-align: center;
                                                text-align-last: center;
                                                font-variant-ligatures: normal;
                                              "
                                            >
                                              <div>
                                                <span
                                                  >You currently have ${dupCount}
                                                  identified duplicates in need
                                                  of deletion in your CRM.
                                                  Follow this link to access
                                                  your account and start merging
                                                  duplicates:</span
                                                >
                                              </div>
                                              <div><span>﻿</span></div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        align="center"
                                        style="padding: 0px 0px 60px 0px"
                                      >
                                        <table
                                          class="pc-width-hug pc-w620-gridCollapsed-0"
                                          align="center"
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          role="presentation"
                                        >
                                          <tr
                                            class="pc-grid-tr-first pc-grid-tr-last"
                                          >
                                            <td
                                              class="pc-grid-td-first pc-grid-td-last"
                                              valign="top"
                                              style="
                                                padding-top: 0px;
                                                padding-right: 0px;
                                                padding-bottom: 0px;
                                                padding-left: 0px;
                                              "
                                            >
                                              <table
                                                border="0"
                                                cellpadding="0"
                                                cellspacing="0"
                                                role="presentation"
                                              >
                                                <tr>
                                                  <td
                                                    align="center"
                                                    valign="top"
                                                  >
                                                    <table
                                                      align="center"
                                                      border="0"
                                                      cellpadding="0"
                                                      cellspacing="0"
                                                      role="presentation"
                                                    >
                                                      <tr>
                                                        <td
                                                          align="center"
                                                          valign="top"
                                                        >
                                                          <table
                                                            align="center"
                                                            border="0"
                                                            cellpadding="0"
                                                            cellspacing="0"
                                                            role="presentation"
                                                          >
                                                            <tr>
                                                              <th
                                                                valign="top"
                                                                align="center"
                                                                style="
                                                                  padding: 0px
                                                                    0px 0px 0px;
                                                                  font-weight: normal;
                                                                  line-height: 1;
                                                                "
                                                              >
                                                                <!--[if mso]>
                                                                  <table
                                                                    border="0"
                                                                    cellpadding="0"
                                                                    cellspacing="0"
                                                                    role="presentation"
                                                                    align="center"
                                                                    style="
                                                                      border-collapse: separate;
                                                                      margin-right: auto;
                                                                      margin-left: auto;
                                                                    "
                                                                  >
                                                                    <tr>
                                                                      <td
                                                                        valign="middle"
                                                                        align="center"
                                                                        style="
                                                                          text-align: center;
                                                                          color: #ffffff;
                                                                          border-radius: 8px;
                                                                          background-color: #000000;
                                                                          padding: 15px
                                                                            17px
                                                                            15px
                                                                            17px;
                                                                        "
                                                                        bgcolor="#000000"
                                                                      >
                                                                        <a
                                                                          class="pc-font-alt"
                                                                          style="
                                                                            display: inline-block;
                                                                            text-decoration: none;
                                                                            font-family: Inter,
                                                                              Arial,
                                                                              Helvetica,
                                                                              sans-serif;
                                                                            font-weight: 500;
                                                                            font-size: 16px;
                                                                            line-height: 150%;
                                                                            letter-spacing: -0.2px;
                                                                            color: #ffffff;
                                                                            font-variant-ligatures: normal;
                                                                          "
                                                                          href="{{.ConfirmationURL }}"
                                                                          target="_blank"
                                                                          >Confirm
                                                                          your
                                                                          email</a
                                                                        >
                                                                      </td>
                                                                    </tr>
                                                                  </table>
                                                                <![endif]-->
                                                                <!--[if !mso]><!-- --><a
                                                                  style="
                                                                    border-radius: 8px;
                                                                    background-color: #000000;
                                                                    padding: 15px
                                                                      17px 15px
                                                                      17px;
                                                                    font-family: Inter,
                                                                      Arial,
                                                                      Helvetica,
                                                                      sans-serif;
                                                                    font-weight: 500;
                                                                    font-size: 16px;
                                                                    line-height: 150%;
                                                                    letter-spacing: -0.2px;
                                                                    color: #ffffff;
                                                                    text-align: center;
                                                                    text-align-last: center;
                                                                    text-decoration: none;
                                                                    display: inline-block;
                                                                    vertical-align: top;
                                                                    -webkit-text-size-adjust: none;
                                                                  "
                                                                  href="https://app.splinar.com/"
                                                                  target="_blank"
                                                                  >Visit my
                                                                  dashboard</a
                                                                >
                                                                <!--<![endif]-->
                                                              </th>
                                                            </tr>
                                                          </table>
                                                        </td>
                                                      </tr>
                                                    </table>
                                                  </td>
                                                </tr>
                                              </table>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        align="center"
                                        valign="top"
                                        style="padding: 0px 60px 24px 60px"
                                      >
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          role="presentation"
                                          align="center"
                                          style="
                                            margin-right: auto;
                                            margin-left: auto;
                                          "
                                        >
                                          <tr>
                                            <td
                                              valign="top"
                                              class="pc-font-alt pc-w620-fontSize-16 pc-w620-lineHeight-26"
                                              align="center"
                                              style="
                                                padding: 0px 0px 0px 0px;
                                                mso-line-height: exactly;
                                                line-height: 156%;
                                                letter-spacing: -0.2px;
                                                font-family: Inter, Arial,
                                                  Helvetica, sans-serif;
                                                font-size: 18px;
                                                font-weight: 300;
                                                color: #9b9b9b;
                                                text-align: center;
                                                text-align-last: center;
                                                font-variant-ligatures: normal;
                                              "
                                            >
                                              <div>
                                                <span
                                                  style="
                                                    color: rgb(155, 155, 155);
                                                  "
                                                  >Questions? Unsatisfactory
                                                  results?
                                                </span>
                                              </div>
                                              <div>
                                                <span
                                                  style="
                                                    color: rgb(155, 155, 155);
                                                  "
                                                  >Reach out to us at</span
                                                ><span
                                                  style="color: rgb(0, 0, 0)"
                                                >
                                                </span
                                                ><a
                                                  href="mailto:support@splinar.com"
                                                  style="
                                                    text-decoration: none;
                                                    color: #9b9b9b;
                                                  "
                                                  ><span
                                                    style="
                                                      text-decoration: underline;
                                                      color: rgb(21, 155, 240);
                                                    "
                                                    >support@splinar.com</span
                                                  ></a
                                                ><span
                                                  style="color: rgb(0, 0, 0)"
                                                  >.</span
                                                >
                                              </div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                  <table
                                    width="100%"
                                    border="0"
                                    cellpadding="0"
                                    cellspacing="0"
                                    role="presentation"
                                  >
                                    <tr>
                                      <td
                                        align="center"
                                        valign="top"
                                        style="padding: 50px 60px 0px 60px"
                                      >
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          role="presentation"
                                          align="center"
                                          style="
                                            margin-right: auto;
                                            margin-left: auto;
                                          "
                                        >
                                          <tr>
                                            <td
                                              valign="top"
                                              class="pc-font-alt pc-w620-fontSize-16 pc-w620-lineHeight-26"
                                              align="center"
                                              style="
                                                padding: 0px 0px 0px 0px;
                                                mso-line-height: exactly;
                                                line-height: 156%;
                                                letter-spacing: -0.2px;
                                                font-family: Inter, Arial,
                                                  Helvetica, sans-serif;
                                                font-size: 12px;
                                                font-weight: 300;
                                                color: #9b9b9b;
                                                text-align: center;
                                                text-align-last: center;
                                                font-variant-ligatures: normal;
                                              "
                                            >
                                              <div>
                                                <span
                                                  style="
                                                    font-weight: 400;
                                                    font-style: normal;
                                                    color: rgb(0, 0, 0);
                                                  "
                                                  >©2024 Splinar</span
                                                >
                                              </div>
                                              <div>
                                                <span
                                                  style="
                                                    font-weight: 400;
                                                    font-style: normal;
                                                    color: rgb(0, 0, 0);
                                                  "
                                                  >Paris, France</span
                                                >
                                              </div>
                                              <div>
                                                <span
                                                  style="
                                                    font-weight: 400;
                                                    font-style: normal;
                                                    color: rgb(0, 0, 0);
                                                  "
                                                  >splinar.com</span
                                                >
                                              </div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <!-- END MODULE: Header 4 -->
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!-- Fix for Gmail on iOS -->
    <div
      class="pc-gmail-fix"
      style="white-space: nowrap; font: 15px courier; line-height: 0"
    >
      &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
      &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
      &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
    </div>
  </body>
</html>
`;
