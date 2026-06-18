import os
import random
import csv
from datetime import datetime, timedelta

def create_cloud_service_costs():
    os.makedirs('content/tracks/data-engineer-python/understanding-cloud-computing/datasets', exist_ok=True)
    with open('content/tracks/data-engineer-python/understanding-cloud-computing/datasets/cloud_service_costs.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['service_model', 'monthly_cost', 'provider', 'workload_type'])
        models = ['IaaS', 'PaaS', 'SaaS']
        providers = ['AWS', 'Azure', 'GCP']
        workloads = ['Database', 'Web', 'Analytics', 'Cache']
        for _ in range(100):
            writer.writerow([
                random.choice(models),
                round(random.uniform(50, 5000), 2),
                random.choice(providers),
                random.choice(workloads)
            ])

def create_server_cpu_metrics():
    os.makedirs('content/tracks/data-engineer-python/understanding-cloud-computing/datasets', exist_ok=True)
    with open('content/tracks/data-engineer-python/understanding-cloud-computing/datasets/server_cpu_metrics.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['timestamp', 'server_id', 'cpu_percent', 'region'])
        base_time = datetime(2023, 1, 1)
        servers = [f'srv-{i}' for i in range(1, 11)]
        regions = ['us-east-1', 'eu-west-1', 'ap-northeast-1']
        for i in range(200):
            writer.writerow([
                (base_time + timedelta(hours=i)).isoformat(),
                random.choice(servers),
                round(random.uniform(10, 95), 1),
                random.choice(regions)
            ])

def create_dr_sla_audit():
    os.makedirs('content/tracks/data-engineer-python/understanding-cloud-computing/datasets', exist_ok=True)
    with open('content/tracks/data-engineer-python/understanding-cloud-computing/datasets/dr_sla_audit.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['system_id', 'rto_hours', 'rpo_hours', 'last_test_date', 'compliant'])
        for i in range(30):
            writer.writerow([
                f'sys-{i}',
                round(random.uniform(1, 48), 1),
                round(random.uniform(0.5, 24), 1),
                '2023-05-01',
                random.choice([0, 1])
            ])

def create_git_commit_log():
    os.makedirs('content/tracks/data-engineer-python/introduction-to-git/datasets', exist_ok=True)
    with open('content/tracks/data-engineer-python/introduction-to-git/datasets/git_commit_log.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['commit_hash', 'author', 'date', 'message', 'files_changed', 'insertions', 'deletions'])
        authors = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
        base_time = datetime(2023, 1, 1)
        for i in range(100):
            writer.writerow([
                hex(random.getrandbits(160))[2:10],
                random.choice(authors),
                (base_time + timedelta(days=i)).strftime('%Y-%m-%d'),
                f'Commit message {i}',
                random.randint(1, 10),
                random.randint(10, 500),
                random.randint(0, 200)
            ])

create_cloud_service_costs()
create_server_cpu_metrics()
create_dr_sla_audit()
create_git_commit_log()
print("Synthetic datasets generated.")
