import { FunctionComponent } from 'react';
import styles from './SendingProgress.module.css';
import spinnerIcon from '../assets/spinner.svg';

interface SendingProgressProps {
  currentStep: number; // 1: Set access policy, 2: Reserve storage, 3: Encrypt & upload, 4: Set download link
  onSignIn: () => void;
  buttonText?: string;
  buttonDisabled?: boolean;
  buttonStyle?: React.CSSProperties;
}

const SendingProgress: FunctionComponent<SendingProgressProps> = ({
  currentStep,
  onSignIn,
  buttonText,
  buttonDisabled,
  buttonStyle
}) => {
  const steps = [
    { id: 1, text: 'Set access policy', cost: '0.0403 SUI' },
    { id: 2, text: 'Reserve storage space', cost: '0.0161 SUI' },
    { id: 3, text: 'Encrypt, upload, and send the file', cost: '0.0161 SUI' },
    { id: 4, text: 'Set the download link', cost: '0.0161 SUI' }
  ];

  const getStepStatus = (stepId: number) => {
    if (currentStep === 0) return 'pending';
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'in-progress';
    return 'pending';
  };

  const getStepIcon = (stepId: number) => {
    const status = getStepStatus(stepId);
    if (status === 'completed') {
      return <div className={styles.checkIcon}>✓</div>;
    } else if (status === 'in-progress') {
      return (
        <div className={styles.spinner}>
          <img src={spinnerIcon} alt="Loading" className={styles.spinnerSvg} />
        </div>
      );
    } else {
      return <div className={styles.pendingIcon}></div>;
    }
  };

  const isSigningInProgress = currentStep > 0 && currentStep <= 4;

  return (
    <div className={styles.sendingProgressContainer}>
      <div className={styles.stepsContainer}>
        <div className={styles.sectionTitle}>Sign process to send</div>
        <div className={styles.stepsWrapper}>
          {steps.map((step, index) => (
            <>
              <div key={`step-${step.id}`} className={styles.stepRow}>
                <div className={styles.stepInfo}>
                  {getStepIcon(step.id)}
                  <div className={styles.stepText}>{step.text}</div>
                </div>
                <div className={styles.stepCost}>{step.cost}</div>
              </div>
              {index < steps.length - 1 && (
                <div key={`connector-${step.id}`} className={styles.connectorContainer}>
                  <div className={styles.connectorWrapper}>
                    <div className={`${styles.connectorLine} ${getStepStatus(step.id) === 'completed' ? styles.completedConnector : ''}`}></div>
                  </div>
                  <div className={styles.connectorSpacer}>
                    <div className={styles.connectorSpacerLine}></div>
                  </div>
                </div>
              )}
            </>
          ))}
        </div>
      </div>

      <div className={styles.totalCost}>
        <div className={styles.totalLabel}>Total cost</div>
        <div className={styles.totalAmount}>0.0564 SUI</div>
      </div>

      <div className={styles.actionSection}>
        <button
          className={`${styles.signButton} ${isSigningInProgress ? styles.signing : ''}`}
          onClick={onSignIn}
          disabled={buttonDisabled !== undefined ? buttonDisabled : isSigningInProgress}
          style={buttonStyle}
        >
          {buttonText !== undefined
            ? buttonText
            : (isSigningInProgress ? 'Signing...' : 'Sign in wallet')
          }
        </button>
        <div className={styles.disclaimer}>
          Only the receiver can see this file not us, not even Sui or Walrus validators.
        </div>
      </div>
    </div>
  );
};

export default SendingProgress;