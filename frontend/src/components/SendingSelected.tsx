import { FunctionComponent, useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import clearButtonIcon from '../../../../zkFileSend/frontend/src/assets/clear-button.svg';
import enterButtonIcon from '../../../../zkFileSend/frontend/src/assets/enter-button.svg';
import SendingProgress from './SendingProgress';

interface SendingSelectedProps {
  selectedFile: File;
  receiverAddress: string;
  onReceiverChange: (value: string) => void;
  onReset: () => void;
  onClearEmail: () => void;
  onSend: () => void;
  onSignIn: () => void;
  isUploading: boolean;
  signingStep?: number; // 1-4 for progress steps, 0 for not started, 5+ for completed
}

// Format file size helper function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const SendingSelected: FunctionComponent<SendingSelectedProps> = ({
                                                                    selectedFile,
                                                                    receiverAddress,
                                                                    onReceiverChange,
                                                                    onReset,
                                                                    onSend,
                                                                    onSignIn,
                                                                    isUploading,
                                                                    signingStep = 0
                                                                  }) => {
  const currentAccount = useCurrentAccount();
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  const [tempAddress, setTempAddress] = useState(receiverAddress);

  const handleEnterPress = () => {
    if (tempAddress.trim()) {
      onReceiverChange(tempAddress);
      setIsAddressConfirmed(true);
    }
  };

  const handleClearAddress = () => {
    setTempAddress('');
    onReceiverChange('');
    setIsAddressConfirmed(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEnterPress();
    }
  };

  // Fee constants (hardcoded for now)
  const STORAGE_FEE = 0.0403; // SUI
  const SEND_FEE = 0.0161; // SUI
  const totalFee = STORAGE_FEE + SEND_FEE; // 0.0564 SUI

  // SUI client for balance checking
  const suiClient = useSuiClient();
  const [userBalance, setUserBalance] = useState<number>(0);


  const hasEnoughBalance = userBalance >= totalFee;

  // Fetch user balance
  const fetchBalance = async () => {
    if (!currentAccount?.address) {
      setUserBalance(0);
      return;
    }

    try {
      const balance = await suiClient.getBalance({
        owner: currentAccount.address,
        coinType: '0x2::sui::SUI'
      });

      // Convert from MIST to SUI (1 SUI = 10^9 MIST)
      const balanceInSui = parseInt(balance.totalBalance) / 1_000_000_000;
      setUserBalance(balanceInSui);

      console.log(`Balance: ${balanceInSui} SUI`);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setUserBalance(0);
    }
  };

  // Trigger balance fetch when account changes
  useEffect(() => {
    fetchBalance();
  }, [currentAccount?.address]);

  // Periodic balance update (optional)
  useEffect(() => {
    if (!currentAccount?.address) return;

    const interval = setInterval(fetchBalance, 30000); // 30초마다
    return () => clearInterval(interval);
  }, [currentAccount?.address]);

  // Button state logic
  const isFormComplete = selectedFile && receiverAddress && isAddressConfirmed;
  const shouldShowSignIn = !currentAccount && isFormComplete;
  const shouldActivateButton = currentAccount && isFormComplete && hasEnoughBalance;
  const isSigningInProgress = signingStep > 0 && signingStep <= 4;

  // Trigger wallet connection by clicking header ConnectButton
  const triggerWalletConnection = () => {
    const connectButtonSelectors = [
      'button[data-dapp-kit]',
      '#root > div > div._header_u2px1_3 > div._signInWrapper_u2px1_57 > button',
      'button[aria-haspopup="dialog"]',
      'header button:contains("Sign in")'
    ];

    for (const selector of connectButtonSelectors) {
      const button = document.querySelector(selector);
      if (button && button instanceof HTMLElement) {
        button.click();
        console.log('Triggered wallet connection via:', selector);
        return;
      }
    }
    console.warn('ConnectButton not found');
  };

  return (
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
      color: '#636161',
      boxSizing: 'border-box'
    }}>
      {/* Selected File Info */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div style={{
            fontSize: '14px',
            letterSpacing: '-0.02em',
            fontWeight: '500',
            color: '#636161'
          }}>
            Choose a file
          </div>
          <button
            onClick={onReset}
            style={{
              fontSize: '14px',
              letterSpacing: '-0.02em',
              fontWeight: '500',
              color: '#b6b6b6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Reset
          </button>
        </div>

        <div style={{
          width: '100%',
          borderRadius: '6px',
          backgroundColor: '#fff',
          border: '1px solid #f1f1f1',
          height: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 0px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              <div style={{
                fontSize: '16px',
                letterSpacing: '-0.02em',
                lineHeight: '135%',
                fontWeight: '600',
                color: '#221d1d',
                opacity: '0.9',
                maxWidth: '230px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {selectedFile.name}
              </div>
            </div>
            <div style={{
              fontSize: '14px',
              lineHeight: '135%',
              color: '#636161'
            }}>
              {formatFileSize(selectedFile.size)}
            </div>
          </div>
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
        <div style={{
          fontSize: '14px',
          letterSpacing: '-0.02em',
          fontWeight: '500',
          color: '#636161'
        }}>
          Enter the receiver
        </div>
        <div style={{
          width: '100%',
          borderRadius: '6px',
          backgroundColor: '#fff',
          border: '1px solid #f1f1f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 16px 10px',
          position: 'relative',
          boxSizing: 'border-box',
          height: '43px'
        }}>
          <input
            type="text"
            placeholder="receiver@gmail.com"
            value={tempAddress}
            onChange={(e) => setTempAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              letterSpacing: '-0.02em',
              fontWeight: '500',
              color: '#221d1d',
              backgroundColor: 'transparent',
              height: '22px'
            }}
          />
          {isAddressConfirmed && receiverAddress ? (
            <button
              onClick={handleClearAddress}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img src={clearButtonIcon} alt="Clear" style={{ width: '16px', height: '16px' }} />
            </button>
          ) : tempAddress ? (
            <button
              onClick={handleEnterPress}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '62px',
                height: '27px',
                flexShrink: 0
              }}
            >
              <img src={enterButtonIcon} alt="Enter" style={{ width: '56.5px', height: '22px' }} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: '100%',
        borderRadius: '1px',
        backgroundColor: '#ebebeb',
        height: '2px'
      }} />

      {/* Sign Process Steps with Progress */}
      <SendingProgress
        currentStep={signingStep}
        onSignIn={shouldShowSignIn ? triggerWalletConnection : onSend}
        buttonText={
          shouldShowSignIn
            ? 'Sign in'
            : currentAccount && !hasEnoughBalance
              ? 'Insufficient balance'
              : (isSigningInProgress || isUploading)
                ? 'Signing...'
                : 'Sign in wallet'
        }
        buttonDisabled={
          shouldShowSignIn ? false : (isUploading || !shouldActivateButton || isSigningInProgress)
        }
        buttonStyle={{
          backgroundColor: shouldShowSignIn
            ? '#221d1d'
            : currentAccount && !hasEnoughBalance
              ? '#ff5f57'  // Red for insufficient balance
              : (isSigningInProgress || isUploading)
                ? '#02bbff'  // Blue for signing
                : shouldActivateButton
                  ? '#02bbff'  // Blue for ready to send
                  : '#b6b6b6', // Gray for disabled
          cursor: (shouldShowSignIn || shouldActivateButton) && !isUploading && !isSigningInProgress ? 'pointer' : 'not-allowed'
        }}
      />
    </div>
  );
};

export default SendingSelected;