use std::collections::HashMap;
use crate::functions::Function;

pub struct FunctionSuggester {
    function_names: Vec<String>
}

impl FunctionSuggester {
    pub fn new() -> Self {
        let mut function_names = Vec::new();
        
        // Get all function names from the Function enum
        for function in Function::into_iter() {
            function_names.push(function.to_string());
        }

        FunctionSuggester { function_names }
    }

    pub fn suggest(&self, input: &str) -> Vec<String> {
        let input_upper = input.to_uppercase();
        
        self.function_names
            .iter()
            .filter(|name| name.starts_with(&input_upper))
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function_suggestions() {
        let suggester = FunctionSuggester::new();
        
        // Test prefix matching
        let results = suggester.suggest("SUM");
        assert!(results.contains(&"SUM".to_string()));
        assert!(results.contains(&"SUMIF".to_string()));
        assert!(results.contains(&"SUMIFS".to_string()));

        // Test case insensitive
        let results = suggester.suggest("sum");
        assert!(results.contains(&"SUM".to_string()));
        assert!(results.contains(&"SUMIF".to_string()));
        assert!(results.contains(&"SUMIFS".to_string()));

        // Test no matches
        let results = suggester.suggest("NOTAFUNCTION");
        assert!(results.is_empty());
    }
} 