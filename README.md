
# 🦥 SlothSort AI — Less Mess. More Life.

**An AI-assisted file organizer built around open-weight models and user-controlled automation.**

SlothSort helps reduce the repetitive work of organizing digital clutter. Select a folder, review category suggestions, and approve the files you want to move.

## ✨ Features

- Open-weight model integration through the Hugging Face Inference API
- Zero-shot category suggestions using `facebook/bart-large-mnli`
- Extension-based fallback when AI is not connected
- Editable category suggestions
- Browser-based folder access in supported browsers
- Confirmation before moving files
- Collision handling for duplicate destination filenames
- Responsive dark forest-green interface

## 🧰 Technology

- HTML, CSS, JavaScript
- Hugging Face Inference API
- `facebook/bart-large-mnli` zero-shot classification model
- File System Access API

## 🚀 Run Locally

### Requirements

- A recent desktop version of Chrome or Edge
- Internet access for loading the hosted AI model and optional web fonts
- A Hugging Face account and an access token with appropriate permissions for hosted model inference

### 1. Download or clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/SlothSort-AI.git
cd SlothSort-AI
```

Replace `YOUR-USERNAME` with your GitHub username.

### 2. Start a local web server

This is a static website; Python and Flask are not required.

If Python is installed, run:

```bash
python -m http.server 8000
```

Open:

http://localhost:8000

You can also use the VS Code Live Server extension. The app needs a supported secure context for browser folder access; localhost normally qualifies.

### 3. Connect the model

1. Create an access token in your Hugging Face account.
2. Give it only the permissions required for inference.
3. Paste it into the app's token field.
4. Click **Connect AI**.
5. Choose a test folder and review the suggestions.

Model access, rate limits, availability and usage policies depend on Hugging Face and the selected inference provider.

## 🧠 How It Works

1. The browser asks you to select a local folder.
2. SlothSort reads the names of files in that folder.
3. If the hosted model is connected, the app sends each filename to the inference API for zero-shot classification.
4. If AI is unavailable, extension-based rules provide suggestions instead.
5. You can edit categories and confirm before the app moves files into category folders.

## 🔐 Privacy and Safety

- The app does not intentionally upload file contents to the model.
- Hosted AI requests send filenames to the inference provider. Filenames can contain sensitive information, so do not use this mode for private filenames unless you accept the provider's terms.
- The access token is kept in page memory and is not deliberately saved to local storage or a project file. It is still exposed to the browser session and should never be published.
- File moves require confirmation.
- Existing destination names are handled with numbered alternatives.
- The app is a prototype, not a security-audited file-management product.

**Always test using copies of your files and maintain backups.** A browser or filesystem error can interrupt an operation, and this prototype does not provide undo functionality.

## 🌱 Why Open Innovation Matters

Open-weight models make it possible for developers to inspect available model options, experiment with alternative models, and build useful AI-powered tools without being limited to a single closed model ecosystem.

SlothSort uses an open-weight classification model for suggestions while keeping the organization decision with the user. This makes the workflow adaptable: a future version could support local inference, alternative models, more categories, or custom classification rules.

This version uses a hosted inference API, so it is **not fully offline**. The model's license and the inference provider's terms should be checked before redistribution or production use.

## 🛣️ Future Improvements

- Local inference for offline use
- Undo and recovery support
- Better file selection controls
- Batch classification and caching
- More accessible folder selection
- Automated tests and improved error recovery

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Open a pull request describing the improvement.

## 📄 Model and Code Licensing

Choose and add an appropriate license for the application code before publishing. Check the model's own license and the inference provider's terms separately; they may not be the same.

## 🦥 The Philosophy

> Automate the boring. Keep the human.

Built for the DEV challenge **Slow and Steady**.
