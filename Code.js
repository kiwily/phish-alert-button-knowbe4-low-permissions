/**
 * This is the main function for the Gmail add-on.
 * It creates a "Report Phishing" button in the Gmail UI.
 */
const IMAGE_URL = "https://example.com/image.svg"
const KNOWBE4_REGION = "eu"
function onGmailMessage(e) {
  // Create a new 'Report Phishing' button
  var button = CardService.newTextButton()
    .setText("Report Phishing")
    .setOnClickAction(CardService.newAction()
        .setFunctionName('reportPhishing'));

  // Create a section to hold the button
  var section = CardService.newCardSection()
    .addWidget(button)
    .addWidget(CardService.newTextParagraph()
        .setText("Click the button to report this email."));

  // Create a card to display the button
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle("Report Phishing")
    .setImageUrl(IMAGE_URL))
    .addSection(section)
    .build();

  // Display the card in the Gmail UI
  return [card];
}

/**
 * This function is called when the "Report Phishing" button is clicked.
 * It retrieves the currently selected email, extracts the X-PHISH-CRID header,
 * and sends a POST request to the KnowBe4 Phish Alert API.
 */
function reportPhishing(e) {
  const forwardingPrefixSubject = "[Phishing report] - "
  // Get the ID of the message the user has open.
  var messageId = e.gmail.messageId;

  // Get an access token scoped to the current message
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);
  var message = GmailApp.getMessageById(messageId);

  // Extract the X-PHISH-CRID header
  var crid = message.getHeader("X-PHISH-CRID");
  
  // Get the user's email address
  var senderEmail = Session.getActiveUser().getEmail();

  // Set the base URL and auth token
  var baseUrl = `https://${KNOWBE4_REGION}.knowbe4.com/api/v1/phishalert`;
  var authToken = PropertiesService.getScriptProperties().getProperty('api_key');

  // Set the headers for the API request
  var headers = {
    "Content-Type": "application/json"
  };

  // Prepare the payload for the API request
  var payload = {
    "addin_version": "3RDP",
    "machine_guid": "unknown",
    "os_architecture": "unknown",
    "os_locale": "unknown",
    "os_name": "unknown",
    "os_version": "unknown",
    "outlook_version": "unknown",
    "auth_token": authToken,
    "sender_email": senderEmail
  };

  // If the X-PHISH-CRID header is present, report the email as phishing
  if (crid) {
    payload.crid = crid;
    var options = {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(payload)
    };

    // Send the API request to the /report endpoint
    var response = UrlFetchApp.fetch(baseUrl + "/report", options);

    // Check the response status code
    if (response.getResponseCode() == 200) {
      // Show a success message to the user
      return displayMessageToUser("This email was part of a training phishing campaign, good catch!\nPhishing email reported successfully!");
    } else {
      // Show an error message to the user
      return displayMessageToUser("Error reporting phishing email. Please try again later.");
    }
  } else {
    // If the X-PHISH-CRID header is not present, forward the email
    var options = {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(payload)
    };
    
    

    // Send the API request to the /forward_emails endpoint
    var response = UrlFetchApp.fetch(baseUrl + "/forward_emails", options);

    // Parse the response to get the list of email addresses
    var recipients = JSON.parse(JSON.parse(response.getContentText())).data.email_forward;

    // Forward the current email to the list of email addresses
    message.forward(recipients, {
      subject: forwardingPrefixSubject + message.getSubject()
    });

    // Show a success message to the user
    return displayMessageToUser("Email reported successfully and shared with the security team!");
  }
}

function displayMessageToUser(msg) {
  var card = CardService.newCardBuilder()
      .addSection(
          CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
                  .setText(msg)))
      .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}



