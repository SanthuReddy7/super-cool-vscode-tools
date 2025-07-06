public class ExampleApexClass {
    
    public void methodWithUnusedVariable() {
        String unusedVariable = 'This variable is not used';
        String usedVariable = 'This variable is used';
        System.debug(usedVariable);
    }
    
    public void methodWithEmptyCatchBlock() {
        try {
            Integer result = 10 / 0;
        } catch (Exception e) {
            // Empty catch block violation
        }
    }
    
    public void methodWithCrudViolation() {
        // CRUD violation - no permission check
        List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 10];
        
        Account newAccount = new Account(Name = 'Test Account');
        insert newAccount;
    }
    
    public void methodWithFlsViolation() {
        // FLS violation - no field-level security check
        Account acc = new Account();
        acc.Name = 'Test';
        acc.Phone = '123-456-7890';
        insert acc;
    }
    
    public void anotherMethodWithUnusedVariable() {
        Integer anotherUnusedVar = 42;
        String message = 'Hello World';
        System.debug(message);
    }

    // New violations based on the updated ruleset

    // ApexSOQLInjection (Priority 1)
    public List<Account> searchAccounts(String name) {
        String query = 'SELECT Id, Name FROM Account WHERE Name = \'' + name + '\'';
        return Database.query(query);
    }

    // ApexSharingViolations (Priority 1)
    public class MyClassWithoutSharing {
        public void doSomething() {
            Account a = new Account(Name = 'Test');
            insert a;
        }
    }

    // ApexBadCrypto (Priority 1)
    public void badCrypto() {
        Blob key = Crypto.generateAesKey(128);
        Blob data = Blob.valueOf('Sensitive Data');
        Blob encrypted = Crypto.encryptWithManagedIV('AES128', key, data);
    }

    // ApexInsecureEndpoint (Priority 1)
    public void insecureEndpoint() {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('http://insecure.example.com/api');
        req.setMethod('GET');
        Http http = new Http();
        HttpResponse res = http.send(req);
    }

    // ApexXSSFromURLParam (Priority 2)
    public PageReference xssFromUrlParam() {
        String param = ApexPages.currentPage().getParameters().get('input');
        return new PageReference('/apex/MyPage?output=' + param);
    }

    // ApexOpenRedirect (Priority 2)
    public PageReference openRedirect(String url) {
        PageReference pr = new PageReference(url);
        pr.setRedirect(true);
        return pr;
    }

    // AvoidGlobalModifier (Priority 2)
    global class GlobalClass {
        global void doSomethingGlobal() {
            System.debug('Global method called');
        }
    }

    // AvoidLogicInTrigger (Priority 2)
    // This would typically be in a trigger file, but for demonstration, we'll put a simplified version here.
    public void triggerLogicExample() {
        List<Account> accs = [SELECT Id FROM Account WHERE Name = 'TriggerTest'];
        if (!accs.isEmpty()) {
            // Some logic here
        }
    }

    // OperationWithLimitsInLoop (Priority 2)
    public void limitsInLoop() {
        for (Integer i = 0; i < 200; i++) {
            Account a = new Account(Name = 'Test' + i);
            insert a; // DML inside loop
        }
    }

    // ApexUnitTestShouldNotUseSeeAllDataTrue (Priority 3)
    @isTest
    static void testSeeAllData() {
        // @isTest(SeeAllData=true) is typically at the class level, but for demonstration
        // we'll simulate a test that relies on existing data.
        List<Account> accounts = [SELECT Id FROM Account LIMIT 1];
        System.assert(!accounts.isEmpty(), 'Should have at least one account');
    }

    // ApexUnitTestClassShouldHaveAsserts (Priority 3)
    @isTest
    static void testNoAsserts() {
        // This test method has no asserts
        Integer x = 1 + 1;
    }

    // ApexUnitTestClassShouldHaveRunAs (Priority 3)
    @isTest
    static void testNoRunAs() {
        // This test method does not use System.runAs
        System.debug('Running test without runAs');
    }

    // AvoidDeeplyNestedIfStmts (Priority 3)
    public void deeplyNestedIfs(Integer a, Integer b, Integer c) {
        if (a > 0) {
            if (b > 0) {
                if (c > 0) {
                    System.debug('All positive');
                }
            }
        }
    }

    // ExcessiveClassLength (Priority 3)
    // This class is intentionally long to trigger the rule.
    public void longMethod1() { /* ... */ }
    public void longMethod2() { /* ... */ }
    public void longMethod3() { /* ... */ }
    public void longMethod4() { /* ... */ }
    public void longMethod5() { /* ... */ }
    public void longMethod6() { /* ... */ }
    public void longMethod7() { /* ... */ }
    public void longMethod8() { /* ... */ }
    public void longMethod9() { /* ... */ }
    public void longMethod10() { /* ... */ }
    public void longMethod11() { /* ... */ }
    public void longMethod12() { /* ... */ }
    public void longMethod13() { /* ... */ }
    public void longMethod14() { /* ... */ }
    public void longMethod15() { /* ... */ }
    public void longMethod16() { /* ... */ }
    public void longMethod17() { /* ... */ }
    public void longMethod18() { /* ... */ }
    public void longMethod19() { /* ... */ }
    public void longMethod20() { /* ... */ }
    public void longMethod21() { /* ... */ }
    public void longMethod22() { /* ... */ }
    public void longMethod23() { /* ... */ }
    public void longMethod24() { /* ... */ }
    public void longMethod25() { /* ... */ }
    public void longMethod26() { /* ... */ }
    public void longMethod27() { /* ... */ }
    public void longMethod28() { /* ... */ }
    public void longMethod29() { /* ... */ }
    public void longMethod30() { /* ... */ }
    public void longMethod31() { /* ... */ }
    public void longMethod32() { /* ... */ }
    public void longMethod33() { /* ... */ }
    public void longMethod34() { /* ... */ }
    public void longMethod35() { /* ... */ }
    public void longMethod36() { /* ... */ }
    public void longMethod37() { /* ... */ }
    public void longMethod38() { /* ... */ }
    public void longMethod39() { /* ... */ }
    public void longMethod40() { /* ... */ }
    public void longMethod41() { /* ... */ }
    public void longMethod42() { /* ... */ }
    public void longMethod43() { /* ... */ }
    public void longMethod44() { /* ... */ }
    public void longMethod45() { /* ... */ }
    public void longMethod46() { /* ... */ }
    public void longMethod47() { /* ... */ }
    public void longMethod48() { /* ... */ }
    public void longMethod49() { /* ... */ }
    public void longMethod50() { /* ... */ }
    public void longMethod51() { /* ... */ }
    public void longMethod52() { /* ... */ }
    public void longMethod53() { /* ... */ }
    public void longMethod54() { /* ... */ }
    public void longMethod55() { /* ... */ }
    public void longMethod56() { /* ... */ }
    public void longMethod57() { /* ... */ }
    public void longMethod58() { /* ... */ }
    public void longMethod59() { /* ... */ }
    public void longMethod60() { /* ... */ }
    public void longMethod61() { /* ... */ }
    public void longMethod62() { /* ... */ }
    public void longMethod63() { /* ... */ }
    public void longMethod64() { /* ... */ }
    public void longMethod65() { /* ... */ }
    public void longMethod66() { /* ... */ }
    public void longMethod67() { /* ... */ }
    public void longMethod68() { /* ... */ }
    public void longMethod69() { /* ... */ }
    public void longMethod70() { /* ... */ }
    public void longMethod71() { /* ... */ }
    public void longMethod72() { /* ... */ }
    public void longMethod73() { /* ... */ }
    public void longMethod74() { /* ... */ }
    public void longMethod75() { /* ... */ }
    public void longMethod76() { /* ... */ }
    public void longMethod77() { /* ... */ }
    public void longMethod78() { /* ... */ }
    public void longMethod79() { /* ... */ }
    public void longMethod80() { /* ... */ }
    public void longMethod81() { /* ... */ }
    public void longMethod82() { /* ... */ }
    public void longMethod83() { /* ... */ }
    public void longMethod84() { /* ... */ }
    public void longMethod85() { /* ... */ }
    public void longMethod86() { /* ... */ }
    public void longMethod87() { /* ... */ }
    public void longMethod88() { /* ... */ }
    public void longMethod89() { /* ... */ }
    public void longMethod90() { /* ... */ }
    public void longMethod91() { /* ... */ }
    public void longMethod92() { /* ... */ }
    public void longMethod93() { /* ... */ }
    public void longMethod94() { /* ... */ }
    public void longMethod95() { /* ... */ }
    public void longMethod96() { /* ... */ }
    public void longMethod97() { /* ... */ }
    public void longMethod98() { /* ... */ }
    public void longMethod99() { /* ... */ }
    public void longMethod100() { /* ... */ }

    // AvoidSoqlInLoops (Priority 3)
    public void soqlInLoop() {
        List<String> names = new List<String>{'Test1', 'Test2'};
        for (String name : names) {
            Account a = [SELECT Id FROM Account WHERE Name = :name LIMIT 1]; // SOQL inside loop
        }
    }

    // MethodNamingConventions (Priority 4)
    public void bad_method_name() {
        System.debug('Bad method name');
    }

    // VariableNamingConventions (Priority 4)
    public void badVariableName() {
        String Bad_Variable_Name = 'test';
        System.debug(Bad_Variable_Name);
    }

    // ApexDocMissingShouldUseJavaDoc (Priority 4)
    public void methodWithoutJavaDoc() {
        System.debug('Missing JavaDoc');
    }

    // ClassNamingConventions (Priority 5)
    // This would be a separate class file, but for demonstration:
    public class bad_class_name {
        public void method() {
            System.debug('Bad class name');
        }
    }

    // FieldNamingConventions (Priority 5)
    public String bad_field_name = 'test';

    // MissingPackageDescription (Priority 5)
    // This would be at the package level, not directly in a class.
}


