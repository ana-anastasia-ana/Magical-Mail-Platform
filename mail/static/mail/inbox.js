document.addEventListener('DOMContentLoaded', () => {
  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => loadMailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => loadMailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => loadMailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => composeEmail('new'));

  // By default, load the inbox
  loadMailbox('inbox');
});

function composeEmail(type, email) {
  // Show compose view and hide other views
  toggleView('#emails-view', '#email-view', '#compose-view');

  // Recipients field read-only when replying to emails
  const recipientsField = document.querySelector('#compose-recipients');
  recipientsField.readOnly = (type === 'new') ? false : true;

  // Initially set email variables
  const title = (type === 'reply') ? "Reply to Email" : "New Email";
  const recipients = (type === 'reply') ? email.sender : '';
  const subject = (type === 'reply') ? (email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`) : '';
  const body = (type === 'reply') ? `\n\n>> On ${email.timestamp} ${email.sender} wrote:\n${email.body}` : '';

  // Set HTML elements for new email
  updateElementText('#compose-title', title);
  updateElementValue('#compose-recipients', recipients);
  updateElementValue('#compose-subject', subject);
  updateElementValue('#compose-body', body);

  // Remove any validation messages
  hideElement('#compose-result');

  // Make sure submit button is blocked in correct circumstances
  blockButtonForField('#compose-submit', recipientsField);

  // Listen for submission of form
  document.querySelector('#compose-form').onsubmit = () => {
    // Saves email content in form into an object to pass into sendEmail function
    const emailObject = {
      recipients: recipientsField.value,
      subject: getElementValue('#compose-subject'),
      body: getElementValue('#compose-body'),
    };
    sendEmail(emailObject);

    // Prevents form automatically submitting
    return false;
  };
}

async function sendEmail(emailObject) {
  try {
    const response = await fetch('/emails', {
      method: 'POST',
      body: JSON.stringify(emailObject),
    });

    const result = await response.json();

    if (!result.error) {
      // If successful, load user's sent inbox
      loadMailbox('sent');
    } else {
      updateElementText('#compose-result', result.error);
      showElement('#compose-result');
      scrollToTop();
    }
  } catch (error) {
    console.error(error);
  }
}

function loadMailbox(mailbox) {
  // Show the mailbox and hide other views
  toggleView('#emails-view', '#email-view', '#compose-view');

  // Show the mailbox name
  updateElementHTML('#emails-view', `<h3>${capitalizeFirstLetter(mailbox)}</h3>`);

  // Get emails
  getEmailsHTML(mailbox);
}

// Updates webpage HTML to include all emails for the given mailbox
async function getEmailsHTML(mailbox) {
  // Waits for the email JSON data
  const emails = await getAllEmails(mailbox);

  // If no emails, update HTML
  if (emails.length === 0) {
    const noResults = document.createElement('div');
    noResults.innerHTML = "You have 0 messages.";
    document.getElementById("emails-view").appendChild(noResults);
  }

  // Creates HTML for each individual email in the mailbox table
  emails.forEach((email, index) => {
    // Adds new div with HTML and styling to show email information
    const emailDiv = document.createElement('div');

    // Sets the first column according to the mailbox
    const firstColumn = (mailbox !== "sent") ? `From: ${email.sender}` : `<strong>To: ${email.recipients}</strong>`;

    emailDiv.innerHTML = `
      <div class="col-6 col-sm-7 col-md-4 p-2 text-truncate">${firstColumn}</div>
      <div class="col-6 col-sm-5 col-md-3 p-2 order-md-2 small text-right text-muted font-italic font-weight-lighter align-self-center">${email.timestamp}</div>
      <div class="col px-2 pb-2 pt-md-2 order-md-1 text-truncate">${email.subject}</div>
    `;
    emailDiv.className = 'row justify-content-between border border-left-0 border-right-0 border-bottom-0 pointer-link p-2';

    // Adds a grey background for read emails in the Inbox
    if (mailbox === "inbox" && email.read) {
      emailDiv.style.backgroundColor = 'rgba(116, 0, 1, 0.5)';
    }

    // Makes unread emails bold
    if (mailbox === "inbox" && !email.read) {
      emailDiv.classList.add('font-weight-bold');
    }

    // Adds an event listener for each email to call the openEmail function when clicked
    emailDiv.addEventListener('click', () => openEmail(email, mailbox));

    // Fixes borders (the last child has borders on all edges, all others don't have a border on the bottom)
    if (index === emails.length - 1) {
      emailDiv.classList.remove('
