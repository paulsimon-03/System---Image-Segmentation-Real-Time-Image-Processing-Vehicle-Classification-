import threading

# Define functions to run each script
def run_VC():
    from main_VC import main as main_VC
    main_VC()

def run_SE():
    from main_SE import main as main_SE
    main_SE()

if __name__ == "__main__":
    # Create threads for each script
    thread_VC = threading.Thread(target=run_VC)
    thread_SE = threading.Thread(target=run_SE)

    # Start both threads
    thread_VC.start()
    thread_SE.start()

    # Wait for both threads to finish
    thread_VC.join()
    thread_SE.join()