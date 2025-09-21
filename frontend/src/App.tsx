import { useState } from "react";
import {
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSignPersonalMessage,
} from "@mysten/dapp-kit";
import { sealService } from "./services/sealService";
import Header from "./components/Header";
import { FAQ } from "./components/FAQ";
import uploadIcon from "./assets/upload.svg";
import { createSendTicketLink } from "./services/zkSendService";
import SendingSelected from "./components/SendingSelected";
import FileSent from "./components/FileSent";

// File type detection based on magic bytes
function detectFileType(data: Uint8Array): string {
  const bytes = Array.from(data.slice(0, 10))

  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return '.jpg'
  }

  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return '.png'
  }

  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return '.gif'
  }

  // PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return '.pdf'
  }

  // ZIP
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
    return '.zip'
  }

  // Default to .bin if unknown
  return '.bin'
}

function App() {
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
	const [receiverAddress, setReceiverAddress] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<{
		blobId: string;
		encryptedSize: number;
	} | null>(null);
	const [alertMessage, setAlertMessage] = useState<{
		type: "error" | "success";
		text: string;
	} | null>(null);
	const [currentTab, setCurrentTab] = useState<"send" | "download">("send");

	// Decrypt functionality states
	const [blobIdInput, setBlobIdInput] = useState("");
	const [isDecrypting, setIsDecrypting] = useState(false);
	// Helper function to extract IDs from transaction result
	const [link, setLink] = useState("");

	const [showFileSent, setShowFileSent] = useState(false)
	const [signingStep, setSigningStep] = useState(0)


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setReceiverAddress('')
    setUploadResult(null)
    setAlertMessage(null)
    setShowFileSent(false)
    setSigningStep(0)
  }

  const clearEmailInput = () => {
    setReceiverAddress('')
  }

  const handleEncryptAndUpload = async () => {
    if (!selectedFile || !receiverAddress) {
      setAlertMessage({ type: 'error', text: 'Please select a file and enter receiver address' })
      return
    }

    if (!currentAccount) {
      setAlertMessage({ type: 'error', text: 'Please connect your wallet first' })
      return
    }
		setIsUploading(true);
		setAlertMessage(null);
		try {
			console.log("Starting encryption and upload...");
			
      setSigningStep(1)
      await sealService.initPolicy(
				receiverAddress,
				currentAccount?.address!,
				signAndExecuteTransaction,
			);


			const result = await sealService.encryptAndUploadWithWallet(
				selectedFile,
				currentAccount?.address!,
				signAndExecuteTransaction,
        setSigningStep
			);

			if (!result) throw new Error('wtf22222')

			setUploadResult(result);
			setAlertMessage({
				type: "success",
				text: `File encrypted and uploaded! Blob ID: ${result.blobId}`,
			});

      setSigningStep(4)
			await createSendTicketLink(
				sessionStorage.getItem('ticketId')!,
				currentAccount.address,
				signAndExecuteTransaction,
				setLink,
			);
      setSigningStep(5)
      setShowFileSent(true)
		} catch (error) {
			console.error("Upload failed:", error);
			setAlertMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Upload failed",
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleDecryptAndDownload = async () => {
		if (!blobIdInput) {
			setAlertMessage({ type: "error", text: "Please enter Blob ID" });
			return;
		}

		if (!currentAccount) {
			setAlertMessage({ type: "error", text: "Please connect your wallet first" });
			return;
		}

		setIsDecrypting(true);
		setAlertMessage(null);
		try {
			console.log("Starting decryption...");
			const decryptedData = await sealService.decryptAndDownloadWithWallet(
				blobIdInput,
				currentAccount.address,
				signPersonalMessage,
			);

			// Detect file type and create download link
			const fileExtension = detectFileType(decryptedData);
			const blob = new Blob([new Uint8Array(decryptedData)]);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `decrypted_file_${Date.now()}${fileExtension}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setAlertMessage({ type: "success", text: "File decrypted and downloaded successfully!" });
		} catch (error) {
			console.error("Decryption failed:", error);
			setAlertMessage({ type: "error", text: error instanceof Error ? error.message : "Decryption failed" });
		} finally {
			setIsDecrypting(false);
		}
	};

  if (currentTab === 'download') {
    return (
      <div style={{
        width: '100%',
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: '#fbfaf9',
        fontFamily: 'Pretendard',
        overflowX: 'hidden'
      }}>
        <Header
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          // onGoogleSignIn={() => console.log('Google Sign In')}
        />
        {/* <Download /> */}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      position: 'relative',
      minHeight: '100vh',
      textAlign: 'center',
      fontSize: '48px',
      color: '#221d1d',
      fontFamily: 'Pretendard',
      backgroundColor: '#fff',
      overflowX: 'hidden'
    }}>
      {/* Background Grid - Figma Implementation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '932px',
        overflow: 'hidden',
        zIndex: 0
      }}>
        {/* Vertical Grid Lines */}
        {Array.from({length: 50}, (_, i) => 43 + (i * 57)).map((left, index) => (
          <div
            key={`v-${index}`}
            style={{
              position: 'absolute',
              top: 0,
              left: `${left}px`,
              backgroundColor: '#f0f0f0',
              width: '1px',
              height: '932px'
            }}
          />
        ))}

        {/* Horizontal Grid Lines */}
        {Array.from({length: 30}, (_, i) => 45 + (i * 57)).map((top, index) => (
          <div
            key={`h-${index}`}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              backgroundColor: '#f0f0f0',
              width: '100vw',
              height: '1px'
            }}
          />
        ))}

        {/* Decorative Grid Boxes */}
        <div style={{ position: 'absolute', top: '331px', left: '158px', backgroundColor: '#f8f8f8', width: '56px', height: '56px' }} />
        <div style={{ position: 'absolute', top: '730px', left: '272px', backgroundColor: '#f8f8f8', width: '56px', height: '56px' }} />
        <div style={{ position: 'absolute', top: '160px', left: '272px', backgroundColor: '#fafafa', width: '56px', height: '56px' }} />
        <div style={{ position: 'absolute', top: '559px', left: '1298px', backgroundColor: '#fafafa', width: '56px', height: '56px' }} />
        <div style={{ position: 'absolute', top: '787px', left: '1241px', backgroundColor: '#fafafa', width: '56px', height: '56px' }} />
        <div style={{ position: 'absolute', top: '217px', left: '1241px', backgroundColor: '#f8f8f8', width: '56px', height: '56px' }} />

        {/* Bottom Fade Gradient */}
        <div style={{
          position: 'absolute',
          top: '729px',
          left: 0,
          background: 'linear-gradient(0deg, #fff, rgba(255, 255, 255, 0))',
          width: '100vw',
          height: '203px'
        }} />
      </div>

      {/* Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        // onGoogleSignIn={() => console.log('Google Sign In')}
      />

      {/* Main Content */}
      <div style={{
        paddingTop: '203px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '120px',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box'
      }}>
        {/* Hero Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '48px',
          width: '100%',
          maxWidth: '1200px',
          position: 'relative'
        }}>
          <div style={{
            width: '368px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              letterSpacing: '-0.02em',
              lineHeight: '120%',
              fontWeight: '600'
            }}>
              Meet zkFileSend.
            </div>
            <div style={{
              fontSize: '20px',
              letterSpacing: '-0.02em',
              lineHeight: '120%',
              fontWeight: '500',
              color: '#636161'
            }}>
              Trusting big tech with your files?<br />
              That's a gamble we don't take.
            </div>
          </div>

          {/* Alert Message */}
          {alertMessage && (
            <div style={{
              width: '600px',
              padding: '12px 16px',
              borderRadius: '6px',
              backgroundColor: alertMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${alertMessage.type === 'error' ? '#fca5a5' : '#86efac'}`,
              fontSize: '14px',
              color: alertMessage.type === 'error' ? '#dc2626' : '#16a34a',
              fontWeight: '500'
            }}>
              {alertMessage.text}
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div style={{
              width: '600px',
              padding: '16px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              fontSize: '14px',
              color: '#16a34a',
              fontWeight: '500',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🎉 Upload Successful!</div>
              <div style={{ marginBottom: '4px' }}><strong>Blob ID:</strong> {uploadResult.blobId}</div>
              <div style={{ marginBottom: '4px' }}><strong>Encrypted Size:</strong> {(uploadResult.encryptedSize / 1024).toFixed(2)} KB</div>
              <div style={{ fontSize: '12px', color: '#16a34a' }}>Share this Blob ID with the receiver to access the file.</div>
            </div>
          )}

          {/* Main Form */}
          {showFileSent ? (
            <FileSent onSendAnother={handleReset} link={link} />
          ) : currentTab === 'send' ? (
            selectedFile ? (
              /* Sending Selected State */
              <SendingSelected
                selectedFile={selectedFile}
                receiverAddress={receiverAddress}
                onReceiverChange={setReceiverAddress}
                onReset={handleReset}
                onClearEmail={clearEmailInput}
                onSend={handleEncryptAndUpload}
                onSignIn={() => {
                  // This will trigger the wallet connection modal
                  // The actual wallet connection is handled by the ConnectButton in Header
                  console.log('Sign in clicked - wallet connection should be triggered');
                }}
                isUploading={isUploading}
                signingStep={signingStep}
              />
            ) : (
              /* Sending Default State */
              <div style={{
                width: '600px',
                boxShadow: '0px 0px 24px rgba(0, 0, 0, 0.06)',
                borderRadius: '12px',
                backgroundColor: '#fbfaf9',
                border: '1px solid #ebebeb',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '32px',
                gap: '24px',
                minWidth: '320px',
                maxWidth: '600px',
                textAlign: 'left',
                fontSize: '14px',
                color: '#636161'
              }}>
                {/* File Upload */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{ fontWeight: '500' }}>Choose a file</div>
                  <div style={{
                    width: '100%',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    border: '1px solid #f1f1f1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px 0px',
                    gap: '12px',
                    fontSize: '16px',
                    color: '#d1d1d1',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      id="file-input"
                    />
                    <label htmlFor="file-input" style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <img src={uploadIcon} alt="Upload" style={{ width: '24px', height: '24px' }} />
                        <div style={{ fontWeight: '500' }}>
                          Drag and drop or select a file.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                {/* Receiver Input */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{ fontWeight: '500' }}>Enter the receiver</div>
                  <input
                    type="text"
                    placeholder="receiver@gmail.com"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      border: '1px solid #f1f1f1',
                      padding: '12px 16px',
                      fontSize: '16px',
                      color: '#221d1d',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {/* Send Button */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  color: '#b6b6b6'
                }}>
                  <button
                    onClick={handleEncryptAndUpload}
                    disabled={isUploading || !selectedFile || !receiverAddress || !currentAccount}
                    style={{
                      width: '100%',
                      borderRadius: '6px',
                      backgroundColor: '#221d1d',
                      color: '#fff',
                      height: '41px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px 16px',
                      border: 'none',
                      fontWeight: '600',
                      cursor: (isUploading || !selectedFile || !receiverAddress || !currentAccount) ? 'not-allowed' : 'pointer',
                      opacity: (isUploading || !selectedFile || !receiverAddress || !currentAccount) ? 0.33 : 1,
                      boxSizing: 'border-box'
                    }}
                  >
                    {isUploading ? 'Encrypting & Uploading...' : 'Send via encryption'}
                  </button>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    textAlign: 'center'
                  }}>
                    Only the receiver can see this file not us, not even Sui or Walrus validators.
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Download Form */
            <div style={{
              width: '600px',
              boxShadow: '0px 0px 24px rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              backgroundColor: '#fbfaf9',
              border: '1px solid #ebebeb',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '32px',
              gap: '24px',
              minWidth: '320px',
              maxWidth: '600px',
              textAlign: 'left',
              fontSize: '14px',
              color: '#636161'
            }}>
              {/* Blob ID Input */}
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <div style={{ fontWeight: '500' }}>Enter Blob ID</div>
                <input
                  type="text"
                  placeholder="Enter Blob ID to decrypt"
                  value={blobIdInput}
                  onChange={(e) => setBlobIdInput(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    border: '1px solid #f1f1f1',
                    padding: '12px 16px',
                    fontSize: '16px',
                    color: '#221d1d',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Download Button */}
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '16px',
                color: '#b6b6b6'
              }}>
                <button
                  onClick={handleDecryptAndDownload}
                  disabled={isDecrypting || !blobIdInput || !currentAccount}
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    backgroundColor: '#221d1d',
                    color: '#fff',
                    height: '41px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 16px',
                    border: 'none',
                    fontWeight: '600',
                    cursor: (isDecrypting || !blobIdInput || !currentAccount) ? 'not-allowed' : 'pointer',
                    opacity: (isDecrypting || !blobIdInput || !currentAccount) ? 0.33 : 1,
                    boxSizing: 'border-box'
                  }}
                >
                  {isDecrypting ? 'Decrypting...' : 'Decrypt & Download'}
                </button>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  Only authorized users can decrypt files.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <FAQ />

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0px',
          gap: '10px',
          fontSize: '14px',
          color: '#d1d1d1'
        }}>
          <div>©zkFileSend 2025</div>
          <div>Powered by Sui.</div>
        </div>
      </div>
    </div>
  )
}

export default App