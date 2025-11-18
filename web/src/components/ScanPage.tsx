import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/ScanPage.css"; 

const ScanPage = () => {
  const navigate = useNavigate();
  const [scanStatus, setScanStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const SCANNER_ID = "reader";
    let scanner: Html5QrcodeScanner | null = null;

    // Clean up existing content more carefully
    const container = document.getElementById(SCANNER_ID);
    if (container) {
      // Only clean if there's actual scanner content (not just empty div)
      const existingScanner = container.querySelector(
        '[id^="html5-qrcode-scanner"]'
      );
      if (existingScanner) {
        container.innerHTML = "";
      }
    }

    // Add custom CSS to fix the file scan text visibility
    const addCustomStyles = () => {
      const styleId = "qr-scanner-custom-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      addCustomStyles();

      scanner = new Html5QrcodeScanner(
        SCANNER_ID,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA,
            Html5QrcodeScanType.SCAN_TYPE_FILE,
          ],
        },
        false // Disable verbose logging for production
      );

      scanner.render(
        (decodedText) => {
          setIsScanning(true);
          setScanStatus({ type: "success", message: "QR Code detected! Redirecting..." });

          const match = decodedText.match(/\/(\d+)$/);
          if (match) {
            const qrId = match[1];
            // Add a small delay to show success message
            setTimeout(() => {
              navigate(`/exhibit/${qrId}`);
            }, 1000);
          } else {
            setScanStatus({
              type: "error",
              message: "Invalid QR code format. Please scan a valid exhibit QR code.",
            });
            setIsScanning(false);
          }

          if (scanner) {
            scanner.clear();
          }
        },
        (error) => {
          // Only show errors for actual issues, not scanning attempts
          if (
            error.includes("No QR code found") ||
            error.includes("QR code parse error")
          ) {
            return; // Don't show these common scanning states
          }
          console.warn("QR scanning error:", error);
        }
      );

      // Show initial instructions
      setScanStatus({
        type: "info",
        message: "Position the QR code within the frame to scan",
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner
          .clear()
          .then(() => {
            const container = document.getElementById(SCANNER_ID);
            if (container) {
              container.innerHTML = "";
            }
          })
          .catch(() => {
            // Fallback cleanup
            const container = document.getElementById(SCANNER_ID);
            if (container) {
              container.innerHTML = "";
            }
          });
      }
      // Remove custom styles when component unmounts
      const customStyles = document.getElementById("qr-scanner-custom-styles");
      if (customStyles) {
        customStyles.remove();
      }
    };
  }, [navigate]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleViewExhibits = () => {
    navigate("/exhibitions");
  };

  return (
    <div className="scan-page">
      <div className="scan-container">
        {/* Title Section */}
        <div className="scan-title-section">
          <h1 className="scan-title">Scan QR Code</h1>
          <p className="scan-subtitle">Discover Singapore's heritage through immersive exhibits</p>
        </div>

        {/* Main Content - Single Column */}
        <div className="scan-main-content">
          {/* QR Scanner Card */}
          <div className="qr-scanner-card">
            <div id="reader"></div>
            {isScanning && <div className="scanning-overlay"></div>}
          </div>

          {/* Instructions Card */}
          <div className="instructions-card">
            <div className="instructions-header">
              <h3>📋 How to Use</h3>
            </div>
            <ul className="instructions-list">
              <li className="instruction-item">
                <div className="instruction-number">1</div>
                <div className="instruction-text">
                  <h4>🎯 Position Camera</h4>
                  <p>Point your device at the QR code with good lighting</p>
                </div>
              </li>
              <li className="instruction-item">
                <div className="instruction-number">2</div>
                <div className="instruction-text">
                  <h4>✋ Hold Steady</h4>
                  <p>Keep device stable until detection completes</p>
                </div>
              </li>
              <li className="instruction-item">
                <div className="instruction-number">3</div>
                <div className="instruction-text">
                  <h4>📤 Upload Alternative</h4>
                  <p>Use file upload if camera isn't working</p>
                </div>
              </li>
              <li className="instruction-item">
                <div className="instruction-number">4</div>
                <div className="instruction-text">
                  <h4>🎨 Explore Content</h4>
                  <p>Access rich exhibit information and guides</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Status Messages */}
        {scanStatus.type && (
          <div className={`scan-status ${scanStatus.type}`}>
            {scanStatus.message}
          </div>
        )}

        {/* Navigation */}
        <div className="scan-navigation">
          <button onClick={handleGoHome} className="nav-button">
            🏠 Home
          </button>
          <button onClick={handleViewExhibits} className="nav-button primary">
            🏛️ Exhibits
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanPage;
