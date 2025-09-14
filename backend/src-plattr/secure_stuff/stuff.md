
# Steps to Start Firestore Emulator

## 🛠️ 1. Run Google Credential Command Before Starting Emulator  

### **Start Emulator in Different Terminals**
#### Terminal 1:
```sh
firebase emulators:start --only firestore,functions --debug
```

#### Terminal 2:
```sh
cd functions/mock  
node importMockData.js
```
✅ Done.

### **Start Firestore + Functions in Emulator with Data Import**
```sh
firebase emulators:start --only firestore,functions --import=./firestore-data --debug
```

⚠️ **If Facing Google Auth Issues**  
- It might be due to the `service-key.json` file.  

### **Added This in `package.json`**
```json
{
  "scripts": {
    "import-mock": "cross-env NODE_ENV=development FUNCTIONS_EMULATOR=true FIRESTORE_EMULATOR_HOST=localhost:8080 node functions/mock/importMockData.js"
  }
}
```

### **Set Google Application Credentials**
```sh
export GOOGLE_APPLICATION_CREDENTIALS="/Users/shauryajaiswal/Desktop/theDev/plattr/src-plattr/secure_stuff/service-account.json"
```

### **Run Import Mock Data**
```sh
npm run import-mock
```

---

# 🔄 Steps to Restart Emulator (Port Kill)
```sh
lsof -t -i:8080 -i:9000 -i:9099 -i:9199 -i:9090 -i:5001 | xargs kill -9
```

---

# 🚀 Run Functions from Postman (After Emulator Initialization)
```plaintext
http://localhost:5001/rms-app-dd875/us-central1/fetchMenu
```

### **Available Endpoints**
- **Fetch Menu**
- **Add Item**
- **Remove Item**
- **Fetch Cart**
- **Checkout**

---

# 🔑 Gemini API Key
```
AIzaSyDof-ULqXYgbRPs_-bVn2rwLQw1RybZZN4
```
```

---

### **✅ Instructions**
1. Copy this content and **paste it into a new file** in VS Code.  
2. Save the file as **`firestore-emulator-setup.md`**.  
3. Use **`Ctrl + Shift + V`** to **preview it properly in VS Code**.  

Now you have a nicely formatted Markdown file with **rich text and code blocks**! 🚀 Let me know if you need any tweaks. 😊



Firebase auth token - 1//0giuoXdizxfTGCgYIARAAGBASNwF-L9IrP48P0defvPaKM723EI0mymfrvZrtnJAdBVUjV3AnMxGLE5zRj_nJHgBFEc9w6Gv0eN8