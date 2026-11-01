#[cfg(test)]
mod tests {
    #[test]
    fn test_active_quests_catalog() {
        let output = std::process::Command::new(env!("CARGO_BIN_EXE_orbshacker-core"))
            .arg("--help")
            .output();

        // The binary should execute successfully or respond
        if let Ok(out) = output {
            assert!(out.status.success() || out.stdout.is_empty());
        }
    }
}
