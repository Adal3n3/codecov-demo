import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="https://a1b65c5a833bbb3ebde57fe9debd77fd@o4506322472796160.ingest.us.sentry.io/4506322575949824",
    integrations=[
        FlaskIntegration(
            transaction_style='endpoint'
        ),
    ],
    # Capture request headers and IP addresses
    send_default_pii=True,
    attach_stacktrace=True,
    # Set sample rate for performance monitoring (optional)
    traces_sample_rate=1.0,
)


from flask import (
    Flask,
    request,
)

from calculator.calculator import Calculator

app = Flask(__name__)

# Send a startup message to verify Sentry is initialized
sentry_sdk.capture_message("Flask app started - Sentry SDK initialized successfully!", level="info")

@app.route('/api/add', methods=['POST'])
def add():
    return operation('add', 2)

@app.route('/api/subtract', methods=['POST'])
def subtract():
    return operation('subtract', 2)

@app.route('/api/multiply', methods=['POST'])
def multiply():
    return operation('multiply', 2)

@app.route('/api/divide', methods=['POST'])
def divide():
    return operation('divide', 2)

@app.route('/api/test-sentry', methods=['GET'])
def test_sentry():
    """Test endpoint to verify Sentry is working"""
    sentry_sdk.capture_message("Sentry test message - SDK is working!", level="info")
    
    # Optionally trigger an error to test error reporting
    if request.args.get('error'):
        raise Exception("Test error for Sentry verification")
    
    return {"message": "Sentry test message sent successfully"}

def operation(method, num_factors):
    factors = []
    if num_factors == 2:
        factors.append(float(request.json.get('x')))
        factors.append(float(request.json.get('y')))

    return str(getattr(Calculator, method)(*factors))


app.run(host='0.0.0.0', port=8080)