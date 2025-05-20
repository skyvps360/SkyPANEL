import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PayPalApiTest() {
  const [orderId, setOrderId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const testPayPalApi = async () => {
    if (!orderId) {
      toast({
        title: "Input required",
        description: "Please enter a PayPal order ID to test",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await fetch('/api/test-paypal-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Unknown error occurred');
      }
      
      setResult(data);
      toast({
        title: 'API Test Successful',
        description: 'PayPal order verification succeeded',
      });
    } catch (err: any) {
      console.error('PayPal API test failed:', err);
      setError(err.message || 'API test failed');
      toast({
        title: 'API Test Failed',
        description: err.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test PayPal API</CardTitle>
        <CardDescription>
          Verify PayPal order information using sandbox credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="order-id">
              PayPal Order ID
            </label>
            <Input
              id="order-id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter a PayPal order ID"
            />
            <p className="text-xs text-muted-foreground">
              Enter a valid PayPal order ID to test the verification API
            </p>
          </div>
          
          <Button 
            onClick={testPayPalApi} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test PayPal Verification
          </Button>
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          {result && (
            <div className="mt-4 p-3 bg-accent/10 border border-accent rounded-md">
              <p className="font-semibold">Result:</p>
              <div className="mt-2 max-h-64 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}